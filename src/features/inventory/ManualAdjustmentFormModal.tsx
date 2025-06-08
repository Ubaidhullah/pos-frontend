import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Button, message, Select, Input } from 'antd';
import { useMutation } from '@apollo/client';
import { CREATE_MANUAL_ADJUSTMENT } from '../../apollo/mutations/inventoryAdjustmentMutations';
import { GET_PRODUCTS_WITH_INVENTORY } from '../../apollo/queries/productQueries';
import { GET_INVENTORY_ADJUSTMENT_HISTORY } from '../../apollo/queries/inventoryAdjustmentQueries';
import { InventoryAdjustmentReason } from '../../common/enums/inventory-adjustment-reason.enum'; // Frontend enum

const { Option } = Select;
const { TextArea } = Input;

interface ProductDataForModal {
  id: string; // Product ID
  name: string;
  currentQuantity: number;
}

interface AdjustmentFormData {
  quantityChange: number;
  reason: InventoryAdjustmentReason;
  notes?: string;
}

interface ManualAdjustmentFormModalProps {
  open: boolean;
  onClose: () => void;
  productToAdjust: ProductDataForModal | null;
}

// Only allow manual reasons in the dropdown
const manualReasons = [
  InventoryAdjustmentReason.MANUAL_ADJUSTMENT,
  InventoryAdjustmentReason.DAMAGE,
  InventoryAdjustmentReason.THEFT,
];

const ManualAdjustmentFormModal: React.FC<ManualAdjustmentFormModalProps> = ({ open, onClose, productToAdjust }) => {
  const [form] = Form.useForm<AdjustmentFormData>();

  const [createAdjustment, { loading }] = useMutation(CREATE_MANUAL_ADJUSTMENT, {
    onCompleted: (data) => {
      message.success(`Stock for "${productToAdjust?.name}" adjusted successfully. New quantity: ${data.createManualAdjustment.quantity}`);
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to adjust stock: ${error.message}`);
    },
    refetchQueries: [
      { query: GET_PRODUCTS_WITH_INVENTORY }, // Refetch the main inventory list
      productToAdjust ? { query: GET_INVENTORY_ADJUSTMENT_HISTORY, variables: { productId: productToAdjust.id } } : undefined,
    ].filter(Boolean) as any,
  });

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: AdjustmentFormData) => {
    if (!productToAdjust) return;
    if (values.quantityChange === 0) {
      message.warning('Quantity change cannot be zero.');
      return;
    }

    createAdjustment({
      variables: {
        createManualAdjustmentInput: {
          productId: productToAdjust.id,
          quantityChange: Number(values.quantityChange),
          reason: values.reason,
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
          name="quantityChange"
          label="Quantity Change"
          tooltip="Enter a positive number to add stock (e.g., 10) or a negative number to remove stock (e.g., -5)."
          rules={[{ required: true, message: 'Quantity change is required.' }]}
        >
          <InputNumber style={{ width: '100%' }} placeholder="e.g., -5 or 10" />
        </Form.Item>
        <Form.Item
          name="reason"
          label="Reason for Adjustment"
          rules={[{ required: true, message: 'Please select a reason.' }]}
        >
          <Select placeholder="Select a reason">
            {manualReasons.map(reason => (
              <Option key={reason} value={reason}>{reason.replace('_', ' ')}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="notes" label="Notes (Optional)">
          <TextArea rows={3} placeholder="Provide details, e.g., 'Stock take count mismatch' or '1 unit dropped during restocking'." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ManualAdjustmentFormModal;