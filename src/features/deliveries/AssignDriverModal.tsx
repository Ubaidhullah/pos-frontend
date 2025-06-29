import React, { useEffect } from 'react';
import { Modal, Form, Select, Button } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import { GET_USERS_FOR_FILTER } from '../../apollo/queries/auditLogQueries';
import { ASSIGN_DRIVER_TO_DELIVERY } from '../../apollo/mutations/deliveryMutations';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { Option } = Select;

interface AssignDriverModalProps {
  open: boolean;
  onClose: () => void;
  deliveryId: string | null;
  currentDriverId?: string | null;
}

const AssignDriverModal: React.FC<AssignDriverModalProps> = ({ open, onClose, deliveryId, currentDriverId }) => {
  const [form] = Form.useForm();
  const { messageApi } = useAntdNotice();
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS_FOR_FILTER);
  
  const [assignDriver, { loading: assignLoading }] = useMutation(ASSIGN_DRIVER_TO_DELIVERY, {
    onCompleted: () => {
      messageApi.success("Driver assigned successfully.");
      onClose(); // This will trigger a refetch on the dashboard
    },
    onError: (err) => messageApi.error(err.message),
  });

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ driverId: currentDriverId });
    }
  }, [open, currentDriverId, form]);

  const handleFinish = (values: { driverId: string }) => {
    if (!deliveryId) return;
    assignDriver({ variables: { assignDriverInput: { deliveryId, driverId: values.driverId } } });
  };

  return (
    <Modal
      title="Assign Driver"
      open={open}
      onCancel={onClose}
      confirmLoading={assignLoading}
      onOk={() => form.submit()}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="driverId" label="Select a Driver" rules={[{ required: true }]}>
          <Select showSearch loading={usersLoading} placeholder="Select a user to assign" allowClear>
            {usersData?.users.map((user: any) => (
              <Option key={user.id} value={user.id}>{user.name || user.email}</Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;
