import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Button, message, Spin, Typography } from 'antd';
import { useMutation } from '@apollo/client';
import { SET_STOCK_MUTATION } from '../../apollo/mutations/inventoryMutations';
import { GET_PRODUCTS_WITH_INVENTORY } from '../../apollo/queries/productQueries'; // Or your main GET_PRODUCTS

const { Text } = Typography;

interface ProductDataForModal {
  id: string; // Product ID
  name: string;
  currentQuantity: number;
}

interface SetStockModalProps {
  open: boolean;
  onClose: () => void;
  productToUpdate: ProductDataForModal | null;
}

const SetStockModal: React.FC<SetStockModalProps> = ({ open, onClose, productToUpdate }) => {
  const [form] = Form.useForm<{ newQuantity: number }>();

  const [setStock, { loading: updateLoading }] = useMutation(SET_STOCK_MUTATION, {
    onCompleted: (data) => {
      message.success(`Stock updated successfully for product. New quantity: ${data.setStock.quantity}`);
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to update stock: ${error.message}`);
    },
    // Refetch the products list to show updated stock.
    // Alternatively, you can update the Apollo cache manually for better UX.
    refetchQueries: [{ query: GET_PRODUCTS_WITH_INVENTORY }],
  });

  useEffect(() => {
    if (open && productToUpdate) {
      form.setFieldsValue({ newQuantity: productToUpdate.currentQuantity });
    } else if (!open) {
      form.resetFields();
    }
  }, [open, productToUpdate, form]);

  const handleFinish = async (values: { newQuantity: number }) => {
    if (!productToUpdate) {
      message.error('No product selected for stock update.');
      return;
    }
    if (values.newQuantity < 0) {
        message.error('Stock quantity cannot be negative.');
        return;
    }

    setStock({
      variables: {
        setStockInput: {
          productId: productToUpdate.id,
          newQuantity: values.newQuantity,
        },
      },
    });
  };

  return (
    <Modal
      title={`Set Stock for ${productToUpdate?.name || 'Product'}`}
      open={open}
      onCancel={onClose}
      confirmLoading={updateLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={updateLoading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={updateLoading} onClick={() => form.submit()}>
          Set Stock
        </Button>,
      ]}
      destroyOnClose
    >
      {productToUpdate && open ? (
        <Form form={form} layout="vertical" name="setStockForm" onFinish={handleFinish}>
          <Form.Item label="Product">
            <Text strong>{productToUpdate.name}</Text> (SKU: {productToUpdate.id.substring(0,8)}...) {/* Assuming ID is SKU or unique identifier here */}
          </Form.Item>
          <Form.Item label="Current Quantity">
            <InputNumber value={productToUpdate.currentQuantity} style={{ width: '100%' }} disabled />
          </Form.Item>
          <Form.Item
            name="newQuantity"
            label="New Stock Quantity"
            rules={[
                { required: true, message: 'Please input the new quantity!' },
                { type: 'number', min: 0, message: 'Quantity cannot be negative.'}
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={0} placeholder="Enter new total quantity" />
          </Form.Item>
        </Form>
      ) : (
        <Spin tip="Loading product data..." />
      )}
    </Modal>
  );
};

export default SetStockModal;