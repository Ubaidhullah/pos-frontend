import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Select, Button, message, Typography, Tag, Spin } from 'antd';
import { useMutation } from '@apollo/client';
import { UPDATE_PURCHASE_ORDER_STATUS } from '../../apollo/mutations/purchaseOrderMutations';
import { GET_PURCHASE_ORDERS } from '../../apollo/queries/purchaseOrderQueries'; // To refetch list
import { PurchaseOrderStatus } from '../../common/enums/purchase-order-status.enum'; // Frontend enum

const { Option } = Select;
const { Text } = Typography;

interface PurchaseOrderBasicInfo {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
}

interface UpdatePOStatusModalProps {
  open: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderBasicInfo | null;
}

// Define allowed transitions (client-side validation, backend should also validate)
const allowedStatusTransitions: Partial<Record<PurchaseOrderStatus, PurchaseOrderStatus[]>> = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.APPROVED]: [PurchaseOrderStatus.SENT, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.SENT]: [PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED], // Receiving happens via ReceiveItemsModal, but admin might force status
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED], // Again, RECEIVE is usually via ReceiveItems
};


const UpdatePOStatusModal: React.FC<UpdatePOStatusModalProps> = ({ open, onClose, purchaseOrder }) => {
  const [form] = Form.useForm<{ newStatus: PurchaseOrderStatus }>();

  const [updateStatus, { loading: updateLoading }] = useMutation(UPDATE_PURCHASE_ORDER_STATUS, {
    onCompleted: (data) => {
      message.success(`Purchase Order #${purchaseOrder?.poNumber} status updated to ${data.updatePurchaseOrderStatus.status}.`);
      onClose(); // Close modal on success
    },
    onError: (error) => {
      message.error(`Failed to update status: ${error.message}`);
    },
    refetchQueries: [{ query: GET_PURCHASE_ORDERS }], // Refetch PO list
  });

  useEffect(() => {
    if (open && purchaseOrder) {
      form.setFieldsValue({ newStatus: purchaseOrder.status }); // Default to current status
    } else if (!open) {
      form.resetFields();
    }
  }, [open, purchaseOrder, form]);

  const handleFinish = async (values: { newStatus: PurchaseOrderStatus }) => {
    if (!purchaseOrder) {
      message.error('No Purchase Order selected.');
      return;
    }
    if (values.newStatus === purchaseOrder.status) {
      message.info('Status is already the same.');
      onClose();
      return;
    }

    // Client-side check for valid transition (backend should enforce this too)
    const validTransitions = allowedStatusTransitions[purchaseOrder.status];
    if (validTransitions && !validTransitions.includes(values.newStatus) && values.newStatus !== PurchaseOrderStatus.CANCELLED ) { // CANCELLED is often a universal option
        // Exception for 'RECEIVED' if no specific transition defined but makes sense
        if (!(values.newStatus === PurchaseOrderStatus.RECEIVED && (purchaseOrder.status === PurchaseOrderStatus.SENT || purchaseOrder.status === PurchaseOrderStatus.PARTIALLY_RECEIVED))) {
             message.error(`Cannot transition from ${purchaseOrder.status} to ${values.newStatus} directly here. Use 'Receive Items' for receiving.`);
             return;
        }
    }


    updateStatus({
      variables: {
        updatePurchaseOrderStatusInput: {
          purchaseOrderId: purchaseOrder.id,
          newStatus: values.newStatus,
        },
      },
    });
  };

  const availableStatuses = useMemo(() => {
    if (!purchaseOrder) return [];
    const currentStatus = purchaseOrder.status;
    // More sophisticated logic could be here based on allowedStatusTransitions
    // For simplicity, listing all, but disabling current. Backend handles transition rules.
    // Or filter based on allowedStatusTransitions
    let options = Object.values(PurchaseOrderStatus);
    if (currentStatus === PurchaseOrderStatus.RECEIVED || currentStatus === PurchaseOrderStatus.CANCELLED) {
        options = [currentStatus]; // No further transitions from these states via this modal
    }
    return options;
  }, [purchaseOrder]);


  const statusColors: { [key in PurchaseOrderStatus]: string } = {
    [PurchaseOrderStatus.DRAFT]: 'blue',
    [PurchaseOrderStatus.APPROVED]: 'cyan',
    [PurchaseOrderStatus.SENT]: 'geekblue',
    [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'orange',
    [PurchaseOrderStatus.RECEIVED]: 'green',
    [PurchaseOrderStatus.CANCELLED]: 'red',
  };

  return (
    <Modal
      title={`Update Status for PO #${purchaseOrder?.poNumber || ''}`}
      open={open}
      onCancel={onClose}
      confirmLoading={updateLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={updateLoading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={updateLoading} onClick={() => form.submit()}
          disabled={purchaseOrder?.status === PurchaseOrderStatus.RECEIVED || purchaseOrder?.status === PurchaseOrderStatus.CANCELLED}
        >
          Update Status
        </Button>,
      ]}
      destroyOnClose
    >
      {purchaseOrder && open ? (
        <Form form={form} layout="vertical" name="updatePOStatusForm" onFinish={handleFinish}>
          <Form.Item label="Current Status">
            <Tag color={statusColors[purchaseOrder.status] || 'default'}>
              {purchaseOrder.status.replace('_', ' ')}
            </Tag>
          </Form.Item>
          <Form.Item
            name="newStatus"
            label="New Status"
            rules={[{ required: true, message: 'Please select a new status!' }]}
          >
            <Select placeholder="Select new status" disabled={purchaseOrder.status === PurchaseOrderStatus.RECEIVED || purchaseOrder.status === PurchaseOrderStatus.CANCELLED}>
              {availableStatuses.map((statusValue) => (
                <Option key={statusValue} value={statusValue} disabled={statusValue === purchaseOrder.status}>
                  {statusValue.replace('_', ' ')}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {purchaseOrder.status === PurchaseOrderStatus.RECEIVED && <Text type="success">This PO is fully received. No further status changes allowed here.</Text>}
          {purchaseOrder.status === PurchaseOrderStatus.CANCELLED && <Text type="danger">This PO is cancelled. No further status changes allowed.</Text>}
        </Form>
      ) : (
        <div style={{textAlign: 'center', padding: '20px'}}><Spin tip="Loading PO data..." /></div>
      )}
    </Modal>
  );
};

export default UpdatePOStatusModal;
