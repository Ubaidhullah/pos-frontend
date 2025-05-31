import React, { useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Modal, Form, Input, InputNumber, Select, Button, message, Spin } from 'antd';
import { GET_CATEGORIES } from '../../apollo/queries/categoryQueries';
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '../../apollo/mutations/productMutations';
import { GET_PRODUCTS, GET_PRODUCT_BY_ID } from '../../apollo/queries/productQueries';

const { Option } = Select;
const { TextArea } = Input;

interface Category { id: string; name: string; }
interface ProductDataForForm { // For initializing form
  name: string;
  sku: string;
  price: number;
  description?: string;
  categoryId?: string;
  initialQuantity?: number;
}
interface ProductToEdit { // Type for product passed as prop
    id: string;
    name: string;
    sku: string;
    price: number;
    description?: string;
    categoryId?: string; // ID of the category
    inventoryItem?: { quantity: number };
}

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  productToEdit?: ProductToEdit | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ open, onClose, productToEdit }) => {
  const [form] = Form.useForm<ProductDataForForm>();

  const { data: categoriesData, loading: categoriesLoading } = useQuery<{ categories: Category[] }>(GET_CATEGORIES);

  // Note: productDataForEdit is fetched by ProductListPage if needed, or can be fetched here.
  // For simplicity, we assume productToEdit prop contains necessary data.
  // If you need to fetch detailed data when editing:
  const { data: productDataForEdit, loading: productEditLoading } = useQuery(GET_PRODUCT_BY_ID, {
     variables: { id: productToEdit?.id },
     skip: !productToEdit?.id || !open, // Skip if not editing or modal not open
     onCompleted: (data) => {
       if (data?.product && open) { // Ensure modal is open to prevent background form updates
         form.setFieldsValue({
           name: data.product.name,
           sku: data.product.sku,
           price: data.product.price,
           description: data.product.description || undefined,
           categoryId: data.product.categoryId || undefined,
           initialQuantity: data.product.inventoryItem?.quantity ?? 0, // This is current stock for edit
         });
       }
     }
   });


  const [createProduct, { loading: createLoading }] = useMutation(CREATE_PRODUCT);
  const [updateProduct, { loading: updateLoading }] = useMutation(UPDATE_PRODUCT);

  useEffect(() => {
    if (open) { // Only set form values when modal becomes visible
        if (productToEdit && !productEditLoading && productDataForEdit?.product) {
             // If data from GET_PRODUCT_BY_ID is ready, use it
            form.setFieldsValue({
                name: productDataForEdit.product.name,
                sku: productDataForEdit.product.sku,
                price: productDataForEdit.product.price,
                description: productDataForEdit.product.description || undefined,
                categoryId: productDataForEdit.product.categoryId || undefined,
                // For edit, 'initialQuantity' field might represent current stock or not be directly editable here
                // Let's assume we are showing current stock but not allowing direct update of it via this 'initialQuantity' field in edit mode
                initialQuantity: productDataForEdit.product.inventoryItem?.quantity,
            });
        } else if (productToEdit) {
            // Fallback to productToEdit prop if query is still loading or didn't run
            form.setFieldsValue({
                name: productToEdit.name,
                sku: productToEdit.sku,
                price: productToEdit.price,
                description: productToEdit.description || undefined,
                categoryId: productToEdit.categoryId || undefined,
                initialQuantity: productToEdit.inventoryItem?.quantity,
            });
        } else {
            form.resetFields(); // For new product
            form.setFieldsValue({ initialQuantity: 0 }); // Default initial quantity
        }
    }
  }, [open, productToEdit, form, productDataForEdit, productEditLoading]);


  const handleFinish = async (values: ProductDataForForm) => {
    try {
      const inputValues = {
        ...values,
        price: Number(values.price), // Ensure price is number
        initialQuantity: values.initialQuantity ? Number(values.initialQuantity) : undefined,
      };
      // initialQuantity is only relevant for new products.
      // For updates, inventory is managed separately or via specific fields if designed so.
      if (!productToEdit) {
        if (inputValues.initialQuantity === undefined || inputValues.initialQuantity < 0) {
            inputValues.initialQuantity = 0;
        }
      } else {
        // In an update, you might not send initialQuantity unless your backend handles it
        // For this example, we assume 'initialQuantity' is NOT part of UpdateProductInput directly.
        // Backend 'updateProduct' might handle other fields like name, price, category, etc.
        // Stock updates are usually via InventoryModule.
        delete (inputValues as any).initialQuantity;
      }


      if (productToEdit && productToEdit.id) {
        await updateProduct({
          variables: { id: productToEdit.id, updateProductInput: inputValues },
          refetchQueries: [{ query: GET_PRODUCTS }], // Refetch list after update
        });
        message.success('Product updated successfully!');
      } else {
        await createProduct({
          variables: { createProductInput: inputValues },
          refetchQueries: [{ query: GET_PRODUCTS }], // Refetch list after creation
        });
        message.success('Product created successfully!');
      }
      form.resetFields();
      onClose();
    } catch (e: any) {
      message.error(`Operation failed: ${e.message}`);
    }
  };

  const modalLoading = categoriesLoading || (productToEdit && productEditLoading) || createLoading || updateLoading;

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
      destroyOnClose // Important to reset form state when modal is closed and re-opened for "Add New"
    >
      {modalLoading && !open && <Spin tip="Loading..." style={{display: 'block', textAlign: 'center', padding: '20px'}}/>}
      {/* Only render form if modal is open to ensure useEffect for form values works correctly */}
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
            {!productToEdit && ( // Only allow setting initial quantity for new products
            <Form.Item
                name="initialQuantity"
                label="Initial Stock Quantity"
                rules={[{type: 'number', min: 0, message: 'Stock must be a non-negative number'}]}
            >
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            )}
            {productToEdit && productDataForEdit?.product?.inventoryItem && ( // Display current stock for existing products (read-only in this form part)
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