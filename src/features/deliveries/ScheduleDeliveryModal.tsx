import React, { useEffect } from 'react';
import { Modal, Form, Button, Select, DatePicker, Input } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import { GET_USERS_FOR_FILTER } from '../../apollo/queries/auditLogQueries';
import { CREATE_DELIVERY_FROM_ORDER } from '../../apollo/mutations/deliveryMutations';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface ScheduleDeliveryModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
}

const ScheduleDeliveryModal: React.FC<ScheduleDeliveryModalProps> = ({ open, onClose, orderId }) => {
  const [form] = Form.useForm();
  const { messageApi } = useAntdNotice();
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS_FOR_FILTER);

  const [createDelivery, { loading: createLoading }] = useMutation(CREATE_DELIVERY_FROM_ORDER, {
    onCompleted: () => {
      messageApi.success("Delivery scheduled successfully!");
      onClose(); // This will trigger refetch on the detail page
    },
    onError: (err) => messageApi.error(`Failed to schedule delivery: ${err.message}`),
  });

  useEffect(() => { if (!open) form.resetFields(); }, [open, form]);

  const handleFinish = (values: any) => {
    if (!orderId) return;
    createDelivery({
      variables: {
        createDeliveryInput: {
          orderId,
          scheduledDate: values.scheduledDate ? values.scheduledDate.toISOString() : undefined,
          driverId: values.driverId,
          notes: values.notes,
        },
      },
    });
  };

  return (
    <Modal
      title="Schedule Delivery"
      open={open}
      onCancel={onClose}
      confirmLoading={createLoading}
      onOk={() => form.submit()}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="scheduledDate" label="Scheduled Delivery Date">
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
        </Form.Item>
        <Form.Item name="driverId" label="Assign Driver">
          <Select loading={usersLoading} placeholder="Select a driver (optional)" allowClear>
            {usersData?.users.map((user: any) => <Option key={user.id} value={user.id}>{user.name || user.email}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="notes" label="Delivery Notes">
          <TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ScheduleDeliveryModal;
