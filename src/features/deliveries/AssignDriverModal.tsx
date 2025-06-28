import React from 'react';
import { Modal, Form, Select, Button, message } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import { GET_USERS } from '../../apollo/queries/userQueries'; // You'll need a query to get users
import { ASSIGN_DRIVER_TO_DELIVERY } from '../../apollo/mutations/deliveryMutations';
import { GET_DELIVERY_BY_ID } from '../../apollo/queries/deliveryQueries';

const { Option } = Select;

interface UserInfo {
  id: string;
  name?: string;
  email: string;
}

interface AssignDriverModalProps {
  open: boolean;
  onClose: () => void;
  delivery: { id: string; driverId?: string | null };
}

const AssignDriverModal: React.FC<AssignDriverModalProps> = ({ open, onClose, delivery }) => {
  const [form] = Form.useForm();

  // Fetch users who can be drivers
  const { data: usersData, loading: usersLoading } = useQuery<{ users: UserInfo[] }>(GET_USERS, {
    variables: { roles: ['DRIVER', 'CASHIER', 'MANAGER'] }, // Example filter
    skip: !open, // Only run query when modal is open
  });

  const [assignDriver, { loading: assignLoading }] = useMutation(ASSIGN_DRIVER_TO_DELIVERY, {
    onCompleted: () => {
      message.success('Driver assigned successfully.');
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to assign driver: ${error.message}`);
    },
    refetchQueries: [
      { query: GET_DELIVERY_BY_ID, variables: { id: delivery.id } }
    ]
  });

  const handleFinish = (values: { driverId: string }) => {
    assignDriver({
      variables: {
        assignDriverInput: {
          deliveryId: delivery.id,
          driverId: values.driverId,
        },
      },
    });
  };

  return (
    <Modal
      title="Assign Driver"
      open={open}
      onCancel={onClose}
      confirmLoading={assignLoading}
      footer={[
        <Button key="back" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" loading={assignLoading} onClick={form.submit}>
          Assign Driver
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ driverId: delivery.driverId }}>
        <Form.Item name="driverId" label="Select a Driver" rules={[{ required: true, message: 'Please select a driver.' }]}>
          <Select
            showSearch
            loading={usersLoading}
            placeholder="Search for a user to assign as driver"
            filterOption={(input, option) =>
              (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
            }
          >
            {usersData?.users.map(user => (
              <Option key={user.id} value={user.id}>{user.name || user.email}</Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;
