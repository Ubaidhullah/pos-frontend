import React, { useEffect } from 'react';
import { Modal, Form, Select, Button, Input } from 'antd';
import { useMutation } from '@apollo/client';
import { UPDATE_DELIVERY_STATUS } from '../../apollo/mutations/deliveryMutations';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { DeliveryStatus } from '../../common/enums/delivery-status.enum';

const { Option } = Select;
const { TextArea } = Input;

interface UpdateDeliveryStatusModalProps {
  open: boolean;
  onClose: () => void;
  delivery: { id: string; status: DeliveryStatus } | null;
}

const UpdateDeliveryStatusModal: React.FC<UpdateDeliveryStatusModalProps> = ({ open, onClose, delivery }) => {
  const [form] = Form.useForm();
  const { messageApi } = useAntdNotice();
  const [updateStatus, { loading }] = useMutation(UPDATE_DELIVERY_STATUS, {
    onCompleted: () => {
      messageApi.success("Delivery status updated.");
      onClose();
    },
    onError: (err) => messageApi.error(err.message),
  });

  useEffect(() => {
    if (delivery) form.setFieldsValue({ status: delivery.status, notes: '' });
  }, [delivery, form]);

  const handleFinish = (values: { status: DeliveryStatus; notes?: string }) => {
    if (!delivery) return;
    updateStatus({
      variables: {
        updateDeliveryStatusInput: {
          deliveryId: delivery.id,
          status: values.status,
          notes: values.notes,
        },
      },
    });
  };

  return (
    <Modal
      title="Update Delivery Status"
      open={open}
      onCancel={onClose}
      confirmLoading={loading}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
          <Select>
            {Object.values(DeliveryStatus).map(s => <Option key={s} value={s}>{s.replace('_', ' ')}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="notes" label="Notes (Optional)">
          <TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UpdateDeliveryStatusModal;
