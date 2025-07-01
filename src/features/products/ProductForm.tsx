import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, Form, Input, Button, message, InputNumber, Select, Row, Col, Divider, Space, Grid, Upload,
  Alert,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';

// --- Local Imports ---
import { GET_CATEGORIES } from '../../apollo/queries/categoryQueries';
import { GET_TAXES } from '../../apollo/queries/taxQueries';
import { UPLOAD_PRODUCT_IMAGE } from '../../apollo/mutations/fileMutations';
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '../../apollo/mutations/productMutations';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import CategoryForm from '../categories/CategoryForm';


const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

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
  imageUrls: UploadFile[];
  initialQuantity?: number;
}

export interface ProductToEdit {
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
  taxes?: { id: string; }[];
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  productToEdit?: ProductToEdit | null;
  onSuccess?: (newProductId: string) => void;
}

interface SettingsInfo {
  displayCurrency?: string;
  baseCurrency?: string;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, onClose, productToEdit, onSuccess }) => {
  const [form] = Form.useForm<ProductFormValues>();
  const { messageApi } = useAntdNotice();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const screens = useBreakpoint(); // Hook to get screen size info

  // --- GraphQL ---
  const { data: categoriesData, loading: categoriesLoading, refetch: refetchCategories } = useQuery<{ categories: CategoryInfo[] }>(GET_CATEGORIES);
  const { data: taxesData, loading: taxesLoading } = useQuery<{ taxes: TaxInfo[] }>(GET_TAXES);
  const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);
  
  const [uploadImage, { loading: uploadLoading }] = useMutation<{ uploadProductImage: string }, { file: any }>(UPLOAD_PRODUCT_IMAGE);
  const [createProduct, { loading: createLoading }] = useMutation(CREATE_PRODUCT, { onCompleted: (data) => { if (data?.createProduct && onSuccess) { onSuccess(data.createProduct.id); } } });
  const [updateProduct, { loading: updateLoading }] = useMutation(UPDATE_PRODUCT);
  
  const isEditMode = !!productToEdit;
  const isLoading = createLoading || updateLoading;

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const currencySymbol = useMemo(() => {
            return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
          }, [settingsData]);

  useEffect(() => {
    if (open) {
      if (productToEdit) {
        const existingImages: UploadFile[] = (productToEdit.imageUrls || []).map((url, index) => ({ uid: `${-1 - index}`, name: url.split('/').pop() || `image-${index}.png`, status: 'done', url: `${import.meta.env.VITE_API_URL}${url}`, thumbUrl: `${import.meta.env.VITE_API_URL}${url}`, }));
        setFileList(existingImages);
        form.setFieldsValue({ ...productToEdit, taxIds: productToEdit.taxes?.map(t => t.id) || [], imageUrls: existingImages, });
      } else {
        form.resetFields();
        setFileList([]);
      }
    }
  }, [open, productToEdit, form]);

  const handlePriceChange = (changedValues: Partial<ProductFormValues>, allValues: ProductFormValues) => {
    const selectedTaxIds = allValues.taxIds || [];
    const availableTaxes = taxesData?.taxes || [];
    const totalTaxRate = selectedTaxIds.reduce((sum, taxId) => {
      const tax = availableTaxes.find(t => t.id === taxId);
      return sum + (tax?.rate || 0);
    }, 0);
    if (totalTaxRate <= 0) {
      if (changedValues.price !== undefined) form.setFieldsValue({ priceIncTax: changedValues.price });
      if (changedValues.priceIncTax !== undefined) form.setFieldsValue({ price: changedValues.priceIncTax });
      return;
    }
    const taxMultiplier = 1 + totalTaxRate / 100;
    if (changedValues.price !== undefined && changedValues.price !== null) {
      form.setFieldsValue({ priceIncTax: parseFloat((changedValues.price * taxMultiplier).toFixed(2)) });
    } else if (changedValues.priceIncTax !== undefined && changedValues.priceIncTax !== null) {
      form.setFieldsValue({ price: parseFloat((changedValues.priceIncTax / taxMultiplier).toFixed(2)) });
    }
  };

  const handleCustomRequest = async (options: any) => { const { file, onSuccess, onError } = options; try { const { data } = await uploadImage({ variables: { file } }); if (data?.uploadProductImage) { onSuccess(data.uploadProductImage, file); } else { throw new Error('Image URL not returned from server.'); } } catch (err: any) { onError(err); messageApi.error(`${file.name} upload failed: ${err.message}`); } };
  
  const handleUploadChange: UploadProps['onChange'] = ({ file, fileList: newFileList }) => {
    const processedList = newFileList.map(f => {
      if (f.response) {
        // The response is the relative path, e.g., /uploads/image.png
        // We construct the full URL for display purposes.
        f.url = `${import.meta.env.VITE_API_URL}${f.response}`;
      }
      return f;
    });
    setFileList(processedList);
  };

  const onFinish = async (values: ProductFormValues) => {
    // Extract the relative path from the full URL for submission
    const finalImageUrls = fileList
      .filter(file => file.status === 'done' && file.url)
      .map(file => file.url!.replace(import.meta.env.VITE_API_URL, ''));
    
    const processedValues = { ...values, imageUrls: finalImageUrls };
    
    try {
      const mutationOptions = { refetchQueries: [{ query: GET_PRODUCTS }] };
      if (isEditMode) {
        await updateProduct({ variables: { id: productToEdit!.id, updateProductInput: processedValues }, ...mutationOptions });
        messageApi.success('Product updated successfully!');
      } else {
        await createProduct({ variables: { createProductInput: processedValues }, ...mutationOptions });
        messageApi.success('Product created successfully!');
      }
      onClose();
    } catch (e: any) {
      messageApi.error(`Operation failed: ${e.message}`);
    }
  };
  const uploadButton = (<div> {uploadLoading ? <LoadingOutlined /> : <PlusOutlined />} <div style={{ marginTop: 8 }}>Upload</div> </div>);

  const handleCategoryCreateSuccess = async (newCategoryId: string) => {
    messageApi.success('New category created!');
    await refetchCategories(); // Refetch the list of categories
    form.setFieldsValue({ categoryId: newCategoryId }); // Automatically select the new category
    setIsCategoryModalOpen(false); // Close the category modal
  };

  return (
    <>
    <Modal
      title={isEditMode ? 'Edit Product' : 'Add New Product'}
      open={open}
      onCancel={onClose}
      width={screens.md ? 800 : '95vw'} // Responsive modal width
      confirmLoading={isLoading}
      footer={[ <Button key="back" onClick={onClose} disabled={isLoading}>Cancel</Button>, <Button key="submit" type="primary" loading={isLoading} onClick={form.submit}> {isEditMode ? 'Save Changes' : 'Create Product'} </Button>, ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handlePriceChange}>
        {/* Use responsive columns: xs={24} for mobile (stacked), md={12} for desktop (side-by-side) */}
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
              <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
                <Select
                  loading={categoriesLoading}
                  placeholder="Select a category"
                  // --- NEW: Use dropdownRender to add a "Create" button ---
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button type="link" icon={<PlusOutlined />} onClick={() => setIsCategoryModalOpen(true)}>
                        Create New Category
                      </Button>
                    </>
                  )}
                >
                  {categoriesData?.categories.map(cat => <Option key={cat.id} value={cat.id}>{cat.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
        </Row>
        
        <Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item>
        <Divider>Pricing & Tax</Divider>
        <Row gutter={24}>
          <Col xs={24} md={12}>
              <Form.Item name="taxIds" label="Applied Taxes">
                <Select mode="multiple" loading={taxesLoading} placeholder="Select tax rates" allowClear>
                  {taxesData?.taxes.filter(t => t.isEnabled).map(tax => ( <Option key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</Option>))}
                </Select>
                {/* --- NEW: Prompt to add taxes if none exist --- */}
                {(taxesData?.taxes.length === 0 && !taxesLoading) && (
                    <Alert 
                        message="No tax rates found."
                        description="You can add tax rates in Administration > Tax Rates."
                        type="info"
                        showIcon
                        style={{ marginTop: 8 }}
                    />
                )}
              </Form.Item>
            </Col>
          <Col xs={24} md={12}>
            <Form.Item name="standardCostPrice" label="Standard Cost Price" rules={[{ required: true }]}>
                <InputNumber addonBefore={currencySymbol} style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
            <Col xs={24} md={12}>
                <Form.Item name="price" label="Price (before tax)" tooltip="Calculates Price (inc. tax) automatically.">
                    <InputNumber addonBefore={currencySymbol} style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="priceIncTax" label="Price (inc. tax)" tooltip="Calculates Price (before tax) automatically.">
                    <InputNumber addonBefore={currencySymbol} style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
            </Col>
        </Row>

        <Divider>Identifiers & Stock</Divider>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item name="sku" label="SKU" tooltip="Leave blank to auto-generate.">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="barcode" label="Barcode (UPC/EAN)">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col xs={24} md={12}>
             <Form.Item name="outletReorderLimit" label="Reorder Limit" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          {!isEditMode && (
             <Col xs={24} md={12}>
                <Form.Item name="initialQuantity" label="Initial Stock Quantity" initialValue={0}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
            </Col>
          )}
        </Row>

        <Divider>Images</Divider>
       <Form.Item label="Product Images" valuePropName="fileList" getValueFromEvent={(e) => {
            if (Array.isArray(e)) return e;
            return e && e.fileList;
        }}>
        <Upload
                listType="picture-card"
                fileList={fileList}
                customRequest={handleCustomRequest}
                onChange={handleUploadChange}
                onPreview={(file) => window.open(file.url, '_blank')}
                onRemove={(file) => {
                    const newFileList = fileList.filter(f => f.uid !== file.uid);
                    setFileList(newFileList);
                    return true;
                }}
                multiple
            >
                {fileList.length >= 8 ? null : uploadButton}
            </Upload>
      </Form.Item>
      </Form>
    </Modal>
    <CategoryForm
        open={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={handleCategoryCreateSuccess} // Pass the success handler
        categoryToEdit={null} // Always for creation in this context
      />
    </>
    
  );
};

export default ProductFormModal;