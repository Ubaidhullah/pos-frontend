import React from 'react';
import { Modal, Form, DatePicker, Input, Button, message, Alert } from 'antd';
import { useMutation } from '@apollo/client';
import dayjs from 'dayjs';
import { CREATE_DELIVERY_FROM_ORDER } from '../../apollo/mutations/deliveryMutations';
import { GET_ORDER_DETAILS_BY_ID } from '../../apollo/queries/orderQueries';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;

interface CreateDeliveryModalProps {
  open: boolean;
  onClose: () => void;
  order: {
    id: string;
    billNumber: string;
    deliveryAddress: string | null;
  };
}

const CreateDeliveryModal: React.FC<CreateDeliveryModalProps> = ({ open, onClose, order }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [createDelivery, { loading }] = useMutation(CREATE_DELIVERY_FROM_ORDER, {
    onCompleted: (data) => {
      const newDeliveryNumber = data.createDeliveryFromOrder.deliveryNumber;
      message.success(`Delivery #${newDeliveryNumber} created successfully!`);
      // Navigate to the new delivery's detail page
      navigate(`/deliveries/${data.createDeliveryFromOrder.id}`);
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to create delivery: ${error.message}`);
    },
    // Refetch the order details to show it's now linked to a delivery
    refetchQueries: [{ query: GET_ORDER_DETAILS_BY_ID, variables: { id: order.id } }],
  });

  const handleFinish = (values: { scheduledDate: dayjs.Dayjs; notes?: string }) => {
    createDelivery({
      variables: {
        createDeliveryInput: {
          orderId: order.id,
          scheduledDate: values.scheduledDate.toISOString(),
          notes: values.notes,
        },
      },
    });
  };

  return (
    <Modal
      title={`Create Delivery for Order #${order.billNumber}`}
      open={open}
      onCancel={onClose}
      confirmLoading={loading}
      footer={[
        <Button key="back" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={form.submit}>
          Create Delivery
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ scheduledDate: dayjs().add(1, 'day') }}>
        <Alert
          message="Delivery Address"
          description={order.deliveryAddress || 'No delivery address specified on the order.'}
          type="info"
          style={{ marginBottom: 24 }}
        />
        <Form.Item
          name="scheduledDate"
          label="Scheduled Delivery Date"
          rules={[{ required: true, message: 'Please select a date.' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="notes" label="Delivery Notes">
          <TextArea rows={3} placeholder="e.g., Leave package at front door." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDeliveryModal;
