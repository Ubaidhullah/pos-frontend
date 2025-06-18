import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Button, Select, Input } from 'antd';
import { useMutation } from '@apollo/client';
import { MANUALLY_SET_STOCK } from '../../apollo/mutations/inventoryAdjustmentMutations';
import { GET_PRODUCTS_WITH_INVENTORY } from '../../apollo/queries/productQueries';
import { GET_INVENTORY_ADJUSTMENT_HISTORY } from '../../apollo/queries/inventoryAdjustmentQueries';
import { InventoryAdjustmentReason } from '../../common/enums/inventory-adjustment-reason.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { Option } = Select;
const { TextArea } = Input;

interface ProductDataForModal {
  id: string; // This is the Product ID
  name: string;
  currentQuantity: number;
}

interface AdjustmentFormData {
  newQuantity: number;
  // This is a simplified input; the service will calculate the change
  // reason: InventoryAdjustmentReason; // This is not needed as it's always MANUAL
  notes?: string;
}

interface ManualAdjustmentFormModalProps {
  open: boolean;
  onClose: () => void;
  productToAdjust: ProductDataForModal | null;
}

const ManualAdjustmentFormModal: React.FC<ManualAdjustmentFormModalProps> = ({ open, onClose, productToAdjust }) => {
  const [form] = Form.useForm<AdjustmentFormData>();
  const { messageApi } = useAntdNotice();

  const [setStock, { loading }] = useMutation(MANUALLY_SET_STOCK, {
    onCompleted: (data) => {
      messageApi.success(`Stock for "${data.manuallySetStock.product.name}" adjusted successfully.`);
      onClose();
    },
    onError: (error) => {
      messageApi.error(`Failed to adjust stock: ${error.message}`);
    },
    refetchQueries: [
      { query: GET_PRODUCTS_WITH_INVENTORY },
      // Also refetch the history for this product so it's up-to-date
      productToAdjust ? { query: GET_INVENTORY_ADJUSTMENT_HISTORY, variables: { productId: productToAdjust.id } } : '',
    ].filter(Boolean),
  });

  useEffect(() => {
    if (open && productToAdjust) {
      form.setFieldsValue({ newQuantity: productToAdjust.currentQuantity, notes: '' });
    }
  }, [open, productToAdjust, form]);

  const handleFinish = async (values: AdjustmentFormData) => {
    if (!productToAdjust) return;
    
    // The backend service calculates the 'quantityChange', so we send the final desired quantity.
    setStock({
      variables: {
        manualStockAdjustmentInput: {
          productId: productToAdjust.id,
          newQuantity: Number(values.newQuantity),
          notes: values.notes,
        },
      },
    });
  };

  return (
    <Modal
      title={`Manual Stock Adjustment for: ${productToAdjust?.name}`}
      open={open}
      onCancel={onClose}
      confirmLoading={loading}
      footer={[
        <Button key="back" onClick={onClose} disabled={loading}>Cancel</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={form.submit}>Submit Adjustment</Button>,
      ]}
      destroyOnClose
    >
      <p>Current stock on hand: <strong>{productToAdjust?.currentQuantity}</strong></p>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="newQuantity"
          label="New Total Stock Quantity"
          rules={[
            { required: true, message: 'Please input the new quantity!' },
            { type: 'number', min: 0, message: 'Quantity cannot be negative.' }
          ]}
          tooltip="Enter the final, correct quantity for this product after your count."
        >
          <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g., 50" />
        </Form.Item>
        <Form.Item
          name="notes"
          label="Reason / Notes for Adjustment"
          rules={[{ required: true, message: 'Please provide a reason for this change.' }]}
        >
          <TextArea rows={3} placeholder="e.g., Annual stock take correction, found misplaced items." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ManualAdjustmentFormModal;
