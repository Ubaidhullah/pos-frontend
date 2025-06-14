import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Button, message, InputNumber, Select, Row, Col, Divider, Space, Tooltip,
} from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CATEGORIES } from '../../apollo/queries/categoryQueries';
import { GET_TAXES } from '../../apollo/queries/taxQueries';
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '../../apollo/mutations/productMutations';
import { GET_PRODUCTS, GET_PRODUCT_BY_ID } from '../../apollo/queries/productQueries';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

// --- Interfaces ---
interface CategoryInfo { id: string; name: string; }
interface TaxInfo { id: string; name: string; rate: number; isEnabled: boolean; }

interface ProductFormValues {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  price?: number;
  priceIncTax?: number;
  standardCostPrice: number;
  outletReorderLimit?: number;
  taxIds?: string[];
  imageUrls: string[];
  initialQuantity?: number;
}

export interface ProductToEdit { // Data shape passed to the modal for editing
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  priceIncTax?: number;
  standardCostPrice?: number;
  outletReorderLimit?: number;
  imageUrls?: string[];
  taxes?: { id: string; }[]; // We only need the IDs for pre-filling the Select
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  productToEdit?: ProductToEdit | null;
}


const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, onClose, productToEdit }) => {
  const [form] = Form.useForm<ProductFormValues>();
  
  // --- Data Fetching ---
  const { data: categoriesData, loading: categoriesLoading } = useQuery<{ categories: CategoryInfo[] }>(GET_CATEGORIES);
  const { data: taxesData, loading: taxesLoading } = useQuery<{ taxes: TaxInfo[] }>(GET_TAXES);
  
  // --- Mutations ---
  const [createProduct, { loading: createLoading }] = useMutation(CREATE_PRODUCT);
  const [updateProduct, { loading: updateLoading }] = useMutation(UPDATE_PRODUCT);

  const isEditMode = !!productToEdit;
  const isLoading = createLoading || updateLoading;

  // --- Price Calculation Logic ---
  const handlePriceChange = (changedValues: Partial<ProductFormValues>) => {
    const allFormValues = form.getFieldsValue();
    const selectedTaxIds = allFormValues.taxIds || [];
    const availableTaxes = taxesData?.taxes || [];

    const totalTaxRate = selectedTaxIds.reduce((sum, taxId) => {
      const tax = availableTaxes.find(t => t.id === taxId);
      return sum + (tax?.rate || 0);
    }, 0);
    
    if (totalTaxRate <= 0) {
      // If no tax, both prices are the same
      if (changedValues.price !== undefined) form.setFieldsValue({ priceIncTax: changedValues.price });
      if (changedValues.priceIncTax !== undefined) form.setFieldsValue({ price: changedValues.priceIncTax });
      return;
    }
    
    const taxMultiplier = 1 + totalTaxRate / 100;

    if (changedValues.price !== undefined && changedValues.price !== null) {
      // If "Price (before tax)" was changed, calculate the other
      const newPriceIncTax = changedValues.price * taxMultiplier;
      form.setFieldsValue({ priceIncTax: parseFloat(newPriceIncTax.toFixed(2)) });
    } else if (changedValues.priceIncTax !== undefined && changedValues.priceIncTax !== null) {
      // If "Price (inc. tax)" was changed, calculate the other
      const newPrice = changedValues.priceIncTax / taxMultiplier;
      form.setFieldsValue({ price: parseFloat(newPrice.toFixed(2)) });
    }
  };

  // --- Form Setup & Submission ---
  useEffect(() => {
    if (open) {
      if (productToEdit) {
        form.setFieldsValue({
          ...productToEdit,
          taxIds: productToEdit.taxes?.map(t => t.id) || [],
          imageUrls: productToEdit.imageUrls || [],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ imageUrls: [''] }); // Start with one empty image URL field
      }
    }
  }, [open, productToEdit, form]);

  const onFinish = async (values: ProductFormValues) => {
    // Filter out empty image URLs before submission
    const processedValues = {
      ...values,
      imageUrls: values.imageUrls?.filter(url => url && url.trim() !== '') || [],
    };
    
    try {
      const mutationOptions = {
        refetchQueries: [{ query: GET_PRODUCTS }],
      };

      if (isEditMode) {
        await updateProduct({
          variables: { id: productToEdit!.id, updateProductInput: processedValues },
          ...mutationOptions,
        });
        message.success('Product updated successfully!');
      } else {
        await createProduct({
          variables: { createProductInput: processedValues },
          ...mutationOptions,
        });
        message.success('Product created successfully!');
      }
      onClose();
    } catch (e: any) {
      message.error(`Operation failed: ${e.message}`);
    }
  };


  return (
    <Modal
      title={isEditMode ? 'Edit Product' : 'Add New Product'}
      open={open}
      onCancel={onClose}
      width={800}
      confirmLoading={isLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={isLoading}>Cancel</Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={form.submit}>
          {isEditMode ? 'Save Changes' : 'Create Product'}
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handlePriceChange}>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
              <Select loading={categoriesLoading} placeholder="Select a category">
                {categoriesData?.categories.map(cat => <Option key={cat.id} value={cat.id}>{cat.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item>
        <Divider>Pricing & Tax</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item name="taxIds" label="Applied Taxes">
              <Select mode="multiple" loading={taxesLoading} placeholder="Select tax rates" allowClear>
                {taxesData?.taxes.filter(t => t.isEnabled).map(tax => (
                  <Option key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="standardCostPrice" label="Standard Cost Price" rules={[{ required: true }]}>
                <InputNumber addonBefore="$" style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
            <Col span={12}>
                <Form.Item name="price" label="Price (before tax)" tooltip="Calculates Price (inc. tax) automatically.">
                    <InputNumber addonBefore="$" style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="priceIncTax" label="Price (inc. tax)" tooltip="Calculates Price (before tax) automatically.">
                    <InputNumber addonBefore="$" style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
            </Col>
        </Row>

        <Divider>Identifiers & Stock</Divider>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item name="sku" label="SKU" tooltip="Leave blank to auto-generate.">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="barcode" label="Barcode (UPC/EAN)">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={12}>
             <Form.Item name="outletReorderLimit" label="Reorder Limit" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          {!isEditMode && (
             <Col span={12}>
                <Form.Item name="initialQuantity" label="Initial Stock Quantity" initialValue={0}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
            </Col>
          )}
        </Row>

        <Divider>Images</Divider>
        <Form.List name="imageUrls">
            {(fields, { add, remove }) => (
                <>
                {fields.map((field, index) => (
                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...field} label={`Image URL ${index + 1}`} style={{flexGrow: 1}}>
                            <Input placeholder="https://example.com/image.jpg" />
                        </Form.Item>
                        <DeleteOutlined onClick={() => remove(field.name)} />
                    </Space>
                ))}
                <Form.Item>
                    <Button type="dashed" onClick={() => add('')} block icon={<PlusOutlined />}>
                    Add Image URL
                    </Button>
                </Form.Item>
                </>
            )}
        </Form.List>

      </Form>
    </Modal>
  );
};

export default ProductFormModal;