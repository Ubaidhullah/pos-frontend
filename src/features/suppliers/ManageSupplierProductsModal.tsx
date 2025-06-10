import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Button, message, Table, InputNumber, Popconfirm, Tooltip, Input, Divider, Space, Typography, Row, Col  } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries'; // Assuming this fetches basic product info { id, name, sku }
import { GET_SUPPLIER_BY_ID, GET_SUPPLIERS } from '../../apollo/queries/supplierQueries';
import { LINK_PRODUCT_TO_SUPPLIER, UNLINK_PRODUCT_FROM_SUPPLIER } from '../../apollo/mutations/supplierMutations';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useAntdNotice } from '../../contexts/AntdNoticeContext'; 


const { Option } = Select;
const { Title } = Typography;

interface ProductBasicInfo {
  id: string;
  name: string;
  sku?: string;
}

interface ProductSupplierLink { // Represents the ProductSupplier join table record
  id: string; // ID of the ProductSupplier record itself
  productId: string;
  product: ProductBasicInfo;
  costPrice?: number;
  supplierProductCode?: string;
}

interface ManageSupplierProductsModalProps {
  open: boolean;
  onClose: () => void;
  supplier: { id: string; name: string; productsSupplied?: ProductSupplierLink[] } | null; // Pass the full supplier object
}

// Form values for linking/editing a product link
interface LinkProductFormValues {
    productId: string;
    costPrice?: number;
    supplierProductCode?: string;
}

const ManageSupplierProductsModal: React.FC<ManageSupplierProductsModalProps> = ({ open, onClose, supplier }) => {
  const [form] = Form.useForm<LinkProductFormValues>();
  const [editingLink, setEditingLink] = useState<ProductSupplierLink | null>(null); // For editing existing cost/code
  const { messageApi } = useAntdNotice(); 
  // Fetch all products for the "Add Product" select dropdown
  const { data: allProductsData, loading: productsLoading } = useQuery<{ products: ProductBasicInfo[] }>(GET_PRODUCTS);

  // Mutations
  const [linkProduct, { loading: linkLoading }] = useMutation(LINK_PRODUCT_TO_SUPPLIER);
  const [unlinkProduct, { loading: unlinkLoading }] = useMutation(UNLINK_PRODUCT_FROM_SUPPLIER);

  const refetchSupplierQueries = [
    { query: GET_SUPPLIER_BY_ID, variables: { id: supplier?.id } },
    { query: GET_SUPPLIERS } // Also refetch the main suppliers list if counts/summary change
  ];

  useEffect(() => {
    if (open && editingLink) {
        form.setFieldsValue({
            productId: editingLink.productId, // This will be disabled
            costPrice: editingLink.costPrice,
            supplierProductCode: editingLink.supplierProductCode
        });
    } else if (open && !editingLink) { // When "Add New Product Link" section is active
        form.resetFields();
    }
  }, [open, editingLink, form]);


  const handleAddOrUpdateLink = async (values: LinkProductFormValues) => {
    if (!supplier) return;
    try {
      await linkProduct({
        variables: {
          linkProductToSupplierInput: {
            supplierId: supplier.id,
            productId: values.productId, // From form selection
            costPrice: values.costPrice ? Number(values.costPrice) : undefined,
            supplierProductCode: values.supplierProductCode || undefined,
          },
        },
        refetchQueries: refetchSupplierQueries,
      });
      messageApi.success(editingLink ? 'Product link details updated!' : 'Product linked to supplier successfully!');
      form.resetFields();
      setEditingLink(null); // Reset editing state
      // The modal might not close automatically, depends on UX preference.
      // onClose(); // Or just let the user continue adding/editing
    } catch (e: any) {
      messageApi.error(`Failed to link/update product: ${e.message}`);
    }
  };

  const handleUnlink = async (productSupplierId: string) => {
    try {
      await unlinkProduct({
        variables: { unlinkProductFromSupplierInput: { productSupplierId } },
        refetchQueries: refetchSupplierQueries,
      });
      messageApi.success('Product unlinked successfully!');
    } catch (e: any) {
      messageApi.error(`Failed to unlink product: ${e.message}`);
    }
  };

  const startEditLink = (link: ProductSupplierLink) => {
    setEditingLink(link);
    // Form values will be set by useEffect
    // Scroll to form or make it prominent
  };


  const columns = [
    { title: 'Product Name', dataIndex: ['product', 'name'], key: 'productName' },
    { title: 'Product SKU', dataIndex: ['product', 'sku'], key: 'productSku', render: (sku?:string) => sku || 'N/A' },
    { title: 'Supplier Cost', dataIndex: 'costPrice', key: 'costPrice', render: (cost?: number) => cost ? `$${cost.toFixed(2)}` : 'N/A' },
    { title: 'Supplier Code', dataIndex: 'supplierProductCode', key: 'supplierProductCode', render: (code?:string) => code || 'N/A' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ProductSupplierLink) => (
        <Space>
            <Tooltip title="Edit Cost/Supplier Code for this product">
                <Button icon={<EditOutlined />} onClick={() => startEditLink(record)} size="small" />
            </Tooltip>
            <Popconfirm
                title="Unlink this product?"
                description="Are you sure you want to remove this product from this supplier?"
                onConfirm={() => handleUnlink(record.id)} // record.id is ProductSupplier.id
                okText="Yes, Unlink"
                cancelText="No"
                okButtonProps={{ loading: unlinkLoading }}
            >
                <Tooltip title="Unlink Product from Supplier">
                <Button icon={<DeleteOutlined />} danger size="small" />
                </Tooltip>
            </Popconfirm>
        </Space>
      ),
    },
  ];

  const linkedProductIds = supplier?.productsSupplied?.map(ps => ps.productId) || [];
  const availableProductsToLink = allProductsData?.products.filter(p => !linkedProductIds.includes(p.id)) || [];

  return (
    <Modal
      title={`Manage Products for Supplier: ${supplier?.name || ''}`}
      open={open}
      onCancel={() => { setEditingLink(null); form.resetFields(); onClose(); }}
      width={800}
      footer={[<Button key="close" onClick={() => { setEditingLink(null); form.resetFields(); onClose(); }}>Close</Button>]}
      destroyOnClose
      maskClosable={false}
    >
        <Title level={5}>{editingLink ? `Editing link for: ${editingLink.product.name}` : 'Link New Product to Supplier'}</Title>
        <Form form={form} layout="vertical" onFinish={handleAddOrUpdateLink} initialValues={{costPrice: 0}}>
            <Row gutter={16}>
                <Col span={editingLink ? 24 : 12}>
                    <Form.Item
                        name="productId"
                        label="Product"
                        rules={[{ required: true, message: 'Please select a product!' }]}
                    >
                        {editingLink ? (
                            <Input value={editingLink.product.name} disabled />
                        ) : (
                            <Select
                                showSearch
                                placeholder="Select a product to link"
                                loading={productsLoading}
                                filterOption={(input, option) =>
                                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase()) ||
                                    (option?.dataSku as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                                }
                                disabled={!!editingLink} // Disable if editing an existing link's details
                            >
                            {availableProductsToLink.map(product => (
                                <Option key={product.id} value={product.id} dataSku={product.sku}>
                                    {product.name} (SKU: {product.sku || 'N/A'})
                                </Option>
                            ))}
                            </Select>
                        )}
                    </Form.Item>
                </Col>
                <Col span={editingLink ? 12 : 6}>
                    <Form.Item name="costPrice" label="Supplier Cost Price" rules={[{type: 'number', min: 0}]}>
                        <InputNumber addonBefore="$" style={{ width: '100%' }} min={0} precision={2} placeholder="0.00"/>
                    </Form.Item>
                </Col>
                <Col span={editingLink ? 12 : 6}>
                    <Form.Item name="supplierProductCode" label="Supplier Product Code">
                        <Input placeholder="Optional code"/>
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item>
                <Button type="primary" htmlType="submit" loading={linkLoading} icon={<PlusOutlined />}>
                {editingLink ? 'Update Link Details' : 'Link Product'}
                </Button>
                {editingLink && <Button style={{marginLeft: 8}} onClick={() => {setEditingLink(null); form.resetFields();}}>Cancel Edit</Button>}
            </Form.Item>
        </Form>
        <Divider />
        <Title level={5}>Currently Linked Products</Title>
        <Table
            columns={columns}
            dataSource={supplier?.productsSupplied || []}
            rowKey="id" // ID of ProductSupplier record
            pagination={{ pageSize: 5 }}
            size="small"
            loading={linkLoading || unlinkLoading} // Reflect loading state on table
        />
    </Modal>
  );
};

export default ManageSupplierProductsModal;