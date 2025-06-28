import React from 'react';
import { Modal, Form, Select, DatePicker, Input, Button, message } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import dayjs from 'dayjs';
import { GET_USERS } from '../../apollo/queries/userQueries';
import { GET_ELIGIBLE_FOR_DELIVERY_ORDERS } from '../../apollo/queries/orderQueries';
import { CREATE_DELIVERY_RUN } from '../../apollo/mutations/deliveryMutations';
import { GET_DELIVERIES } from '../../apollo/queries/deliveryQueries';

const { Option } = Select;
const { TextArea } = Input;

interface UserInfo {
  id: string;
  name?: string;
  email: string;
}

interface EligibleOrder {
  id: string;
  billNumber: string;
  customer?: { name?: string };
}

interface CreateDeliveryRunModalProps {
  open: boolean;
  onClose: () => void;
}

const CreateDeliveryRunModal: React.FC<CreateDeliveryRunModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();

  // --- Data Fetching ---
  const { data: usersData, loading: usersLoading } = useQuery<{ users: UserInfo[] }>(GET_USERS);
  const { data: ordersData, loading: ordersLoading } = useQuery<{ orders: EligibleOrder[] }>(
    GET_ELIGIBLE_FOR_DELIVERY_ORDERS,
    { skip: !open, fetchPolicy: 'network-only' } // Only fetch when modal is open
  );
  
  const [createDeliveryRun, { loading: createLoading }] = useMutation(CREATE_DELIVERY_RUN, {
    onCompleted: (data) => {
      message.success(`Delivery run #${data.createDeliveryRun.deliveryNumber} created.`);
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to create delivery run: ${error.message}`);
    },
    refetchQueries: [{ query: GET_DELIVERIES }],
  });

  const handleFinish = (values: { driverId: string; scheduledDate: dayjs.Dayjs; orderIds: string[]; notes?: string; }) => {
    createDeliveryRun({
      variables: {
        createDeliveryRunInput: {
          driverId: values.driverId,
          scheduledDate: values.scheduledDate.toISOString(),
          orderIds: values.orderIds,
          notes: values.notes,
        },
      },
    });
  };

  return (
    <Modal
      title="Create New Delivery Run"
      open={open}
      onCancel={onClose}
      width={720}
      confirmLoading={createLoading}
      footer={[
        <Button key="back" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" loading={createLoading} onClick={form.submit}>
          Create Run
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ scheduledDate: dayjs() }}>
        <Form.Item name="driverId" label="Assign to Driver" rules={[{ required: true }]}>
          <Select showSearch loading={usersLoading} placeholder="Select a driver">
            {usersData?.users.map(u => <Option key={u.id} value={u.id}>{u.name || u.email}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="scheduledDate" label="Scheduled Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="orderIds" label="Orders to Include" rules={[{ required: true, message: 'Please select at least one order.' }]}>
          <Select
            mode="multiple"
            allowClear
            loading={ordersLoading}
            placeholder="Select orders to add to this delivery run"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={ordersData?.orders.map(order => ({
                label: `Order #${order.billNumber} (${order.customer?.name || 'Walk-in'})`,
                value: order.id,
            }))}
          />
        </Form.Item>
        <Form.Item name="notes" label="Notes for this Run">
          <TextArea rows={3} placeholder="e.g., Morning route for east side." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDeliveryRunModal;
