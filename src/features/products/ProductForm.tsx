import React, { useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Modal, Form, Input, InputNumber, Select, Button, message, Spin } from 'antd';
import { GET_CATEGORIES } from '../../apollo/queries/categoryQueries';
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '../../apollo/mutations/productMutations';
import { GET_PRODUCTS, GET_PRODUCT_BY_ID } from '../../apollo/queries/productQueries';
import { GET_TAXES } from '../../apollo/queries/taxQueries';

const { Option } = Select;
const { TextArea } = Input;

interface Category { id: string; name: string; }
interface TaxInfo { 
  id: string; 
  name: string; 
  rate: number; 
  isEnabled: boolean;
  isDefault?: boolean;
}

interface ProductDataForForm {
  name: string;
  sku: string;
  price: number;
  description?: string;
  categoryId?: string;
  initialQuantity?: number;
  taxId?: string; // ADDED: Tax ID field
}

interface ProductToEdit {
    id: string;
    name: string;
    sku: string;
    price: number;
    description?: string;
    categoryId?: string;
    inventoryItem?: { quantity: number };
    taxId?: string; // ADDED: Tax ID field
}

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  productToEdit?: ProductToEdit | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ open, onClose, productToEdit }) => {
  const [form] = Form.useForm<ProductDataForForm>();

  const { data: categoriesData, loading: categoriesLoading } = useQuery<{ categories: Category[] }>(GET_CATEGORIES);
  
  // ADDED: Tax rate query
  const { data: taxesData, loading: taxesLoading } = useQuery<{ taxes: TaxInfo[] }>(GET_TAXES);

  const { data: productDataForEdit, loading: productEditLoading } = useQuery(GET_PRODUCT_BY_ID, {
     variables: { id: productToEdit?.id },
     skip: !productToEdit?.id || !open,
     onCompleted: (data) => {
       if (data?.product && open) {
         form.setFieldsValue({
           name: data.product.name,
           sku: data.product.sku,
           price: data.product.price,
           description: data.product.description || undefined,
           categoryId: data.product.categoryId || undefined,
           initialQuantity: data.product.inventoryItem?.quantity ?? 0,
           taxId: data.product.taxId || undefined, // ADDED: Set taxId
         });
       }
     }
   });

  const [createProduct, { loading: createLoading }] = useMutation(CREATE_PRODUCT);
  const [updateProduct, { loading: updateLoading }] = useMutation(UPDATE_PRODUCT);

  useEffect(() => {
    if (open) {
        if (productToEdit && !productEditLoading && productDataForEdit?.product) {
            form.setFieldsValue({
                name: productDataForEdit.product.name,
                sku: productDataForEdit.product.sku,
                price: productDataForEdit.product.price,
                description: productDataForEdit.product.description || undefined,
                categoryId: productDataForEdit.product.categoryId || undefined,
                initialQuantity: productDataForEdit.product.inventoryItem?.quantity,
                taxId: productDataForEdit.product.taxId || undefined, // ADDED
            });
        } else if (productToEdit) {
            form.setFieldsValue({
                name: productToEdit.name,
                sku: productToEdit.sku,
                price: productToEdit.price,
                description: productToEdit.description || undefined,
                categoryId: productToEdit.categoryId || undefined,
                initialQuantity: productToEdit.inventoryItem?.quantity,
                taxId: productToEdit.taxId || undefined, // ADDED
            });
        } else {
            form.resetFields();
            const defaultTax = taxesData?.taxes.find(t => t.isDefault);
            form.setFieldsValue({ 
              initialQuantity: 0,
              taxId: defaultTax?.id // ADDED: Set default tax for new products
            });
        }
    }
  }, [open, productToEdit, form, productDataForEdit, productEditLoading, taxesData]); // ADDED: taxesData dependency

  const handleFinish = async (values: ProductDataForForm) => {
    try {
      const inputValues = {
        ...values,
        price: Number(values.price),
        initialQuantity: values.initialQuantity ? Number(values.initialQuantity) : undefined,
        taxId: values.taxId || null, // ADDED: Send null if no tax selected
      };
      
      if (!productToEdit) {
        if (inputValues.initialQuantity === undefined || inputValues.initialQuantity < 0) {
            inputValues.initialQuantity = 0;
        }
      } else {
        delete (inputValues as any).initialQuantity;
      }

      if (productToEdit && productToEdit.id) {
        await updateProduct({
          variables: { 
            id: productToEdit.id, 
            updateProductInput: inputValues 
          },
          refetchQueries: [{ query: GET_PRODUCTS }],
        });
        message.success('Product updated successfully!');
      } else {
        await createProduct({
          variables: { createProductInput: inputValues },
          refetchQueries: [{ query: GET_PRODUCTS }],
        });
        message.success('Product created successfully!');
      }
      form.resetFields();
      onClose();
    } catch (e: any) {
      message.error(`Operation failed: ${e.message}`);
    }
  };

  const modalLoading = categoriesLoading || taxesLoading || (productToEdit && productEditLoading) || createLoading || updateLoading;

  return (
    <Modal
      title={productToEdit ? 'Edit Product' : 'Add New Product'}
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={[
        <Button key="back" onClick={() => { form.resetFields(); onClose(); }}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={createLoading || updateLoading} onClick={() => form.submit()}>
          {productToEdit ? 'Save Changes' : 'Create Product'}
        </Button>,
      ]}
      destroyOnClose
    >
      {modalLoading && !open && <Spin tip="Loading..." style={{display: 'block', textAlign: 'center', padding: '20px'}}/>}
      {open && (
        <Form form={form} layout="vertical" name="productForm" onFinish={handleFinish} >
            <Form.Item
            name="name"
            label="Product Name"
            rules={[{ required: true, message: 'Please input the product name!' }]}
            >
            <Input />
            </Form.Item>
            <Form.Item
            name="sku"
            label="SKU"
            rules={[{ required: true, message: 'Please input the SKU!' }]}
            >
            <Input />
            </Form.Item>
            <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true, message: 'Please input the price!' }, {type: 'number', min: 0, message: 'Price must be a positive number'}]}
            >
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
            </Form.Item>
            <Form.Item name="description" label="Description">
            <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="categoryId" label="Category">
            <Select loading={categoriesLoading} placeholder="Select a category" allowClear>
                {categoriesData?.categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
            </Select>
            </Form.Item>
            
            {/* ADDED: Tax rate selector */}
            <Form.Item name="taxId" label="Tax Rate" tooltip="Assign a tax rate to this product">
                <Select loading={taxesLoading} placeholder="Select a tax rate" allowClear>
                    <Option value={null}>No Tax</Option>
                    {taxesData?.taxes
                        .filter(t => t.isEnabled)
                        .map(tax => (
                            <Option key={tax.id} value={tax.id}>
                                {tax.name} ({tax.rate}%)
                            </Option>
                        ))}
                </Select>
            </Form.Item>

            {!productToEdit && (
            <Form.Item
                name="initialQuantity"
                label="Initial Stock Quantity"
                rules={[{type: 'number', min: 0, message: 'Stock must be a non-negative number'}]}
            >
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            )}
            {productToEdit && productDataForEdit?.product?.inventoryItem && (
                <Form.Item label="Current Stock Quantity">
                    <Input value={productDataForEdit.product.inventoryItem.quantity} readOnly />
                </Form.Item>
            )}
        </Form>
      )}
    </Modal>
  );
};

export default ProductForm;