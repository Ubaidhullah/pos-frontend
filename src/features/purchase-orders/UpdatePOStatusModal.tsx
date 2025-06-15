import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Select, Button, Typography, Tag } from 'antd';
import { useMutation } from '@apollo/client';
import { UPDATE_PURCHASE_ORDER_STATUS } from '../../apollo/mutations/purchaseOrderMutations';
import { GET_PURCHASE_ORDERS } from '../../apollo/queries/purchaseOrderQueries';
import { PurchaseOrderStatus } from '../../common/enums/purchase-order-status.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

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

const UpdatePOStatusModal: React.FC<UpdatePOStatusModalProps> = ({ open, onClose, purchaseOrder }) => {
  const [form] = Form.useForm<{ newStatus: PurchaseOrderStatus }>();
  const { messageApi } = useAntdNotice();

  const [updateStatus, { loading: updateLoading }] = useMutation(UPDATE_PURCHASE_ORDER_STATUS, {
    onCompleted: (data) => {
      messageApi.success(`PO #${purchaseOrder?.poNumber} status updated to ${data.updatePurchaseOrderStatus.status}.`);
      onClose();
    },
    onError: (error) => {
      messageApi.error(`Failed to update status: ${error.message}`);
    },
    refetchQueries: [{ query: GET_PURCHASE_ORDERS }],
  });

  useEffect(() => {
    if (open && purchaseOrder) {
      form.setFieldsValue({ newStatus: purchaseOrder.status });
    }
  }, [open, purchaseOrder, form]);

  const handleFinish = (values: { newStatus: PurchaseOrderStatus }) => {
    if (!purchaseOrder) return;
    if (values.newStatus === purchaseOrder.status) {
      messageApi.info('Status is already the same.');
      onClose();
      return;
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

  const statusColors: Record<PurchaseOrderStatus, string> = {
    [PurchaseOrderStatus.DRAFT]: 'blue',
    [PurchaseOrderStatus.APPROVED]: 'cyan',
    [PurchaseOrderStatus.SENT]: 'geekblue',
    [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'orange',
    [PurchaseOrderStatus.RECEIVED]: 'green',
    [PurchaseOrderStatus.CANCELLED]: 'red',
  };
  
  const availableStatuses = useMemo(() => {
      if (!purchaseOrder || [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED].includes(purchaseOrder.status)) {
          return [purchaseOrder?.status];
      }
      return Object.values(PurchaseOrderStatus);
  }, [purchaseOrder]);

  return (
    <Modal
      title={`Update Status for PO #${purchaseOrder?.poNumber || ''}`}
      open={open}
      onCancel={onClose}
      confirmLoading={updateLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={updateLoading}>Cancel</Button>,
        <Button key="submit" type="primary" loading={updateLoading} onClick={form.submit} disabled={!purchaseOrder || [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED].includes(purchaseOrder.status)}>
          Update Status
        </Button>,
      ]}
      destroyOnClose
    >
      {purchaseOrder && (
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item label="Current Status">
            <Tag color={statusColors[purchaseOrder.status] || 'default'}>
              {purchaseOrder.status.replace('_', ' ')}
            </Tag>
          </Form.Item>
          <Form.Item name="newStatus" label="New Status" rules={[{ required: true }]}>
            <Select placeholder="Select new status">
              {availableStatuses.map((statusValue) => (
                <Option key={statusValue} value={statusValue} disabled={statusValue === purchaseOrder.status}>
                  {statusValue ? statusValue.replace('_', ' ') : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default UpdatePOStatusModal;
