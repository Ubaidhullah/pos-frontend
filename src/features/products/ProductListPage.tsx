import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, message, Popconfirm, Tooltip, Typography, Tag, Image, Empty, Input, Card, Grid, Row, Col, List  } from 'antd'; 
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { DELETE_PRODUCT } from '../../apollo/mutations/productMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import ProductFormModal, { type ProductToEdit } from './ProductForm';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';


const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// Interfaces updated to ensure tax 'rate' and the 'pricesEnteredWithTax' setting are available
interface TaxInfo {
  id: string;
  name: string;
  rate: number;
}

interface ProductListData {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrls: string[]; 
  category?: { name: string; };
  inventoryItem?: { quantity: number; };
  taxes: TaxInfo[];
}

interface SettingsInfo {
  displayCurrency?: string;
  baseCurrency?: string;
  pricesEnteredWithTax?: boolean;
}

const ProductListPage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<{ products: ProductListData[] }>(GET_PRODUCTS);
  const [deleteProductMutation, { loading: deleteLoading }] = useMutation(DELETE_PRODUCT);
  const { hasRole } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductToEdit | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); 
  const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);
  
  // Hook to get screen size information
  const screens = useBreakpoint();

  const currencySymbol = useMemo(() => {
          return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
        }, [settingsData]);

  const pricesEnteredWithTax = settingsData?.settings.pricesEnteredWithTax || false;

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    if (!searchTerm) return data.products;
    
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.products.filter(product =>
      product.name.toLowerCase().includes(lowercasedTerm) ||
      (product.sku && product.sku.toLowerCase().includes(lowercasedTerm)) ||
      (product.category && product.category.name.toLowerCase().includes(lowercasedTerm))
    );
  }, [data, searchTerm]);
  
  if (error) {
    message.error(`Error loading products: ${error.message}`);
  }

  const handleDelete = async (product: ProductListData) => {
    try {
      await deleteProductMutation({
        variables: { id: product.id },
        refetchQueries: [{ query: GET_PRODUCTS }],
      });
      message.success(`Product "${product.name}" deleted successfully`);
    } catch (e: any) {
      message.error(`Error deleting product: ${e.message}`);
    }
  };

  const showEditModal = (product: ProductListData) => {
    const productToEdit: ProductToEdit = {
      ...product,
      categoryId: (product as any).category?.id,
      taxes: product.taxes?.map((t: TaxInfo) => ({id: t.id})),
    };
    setEditingProduct(productToEdit);
    setIsModalOpen(true);
  };
  
  // --- Columns definition for Desktop View ---
  const desktopColumns = [
    { title: 'Image', dataIndex: 'imageUrls', key: 'image', width: 80, render: (imageUrls: string[]) => { const fullImageUrl = imageUrls && imageUrls.length > 0 ? `${import.meta.env.VITE_API_URL}${imageUrls[0]}` : null; return fullImageUrl ? <Image width={50} src={fullImageUrl} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />; }},
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: ProductListData, b: ProductListData) => a.name.localeCompare(b.name) },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Category', dataIndex: ['category', 'name'], key: 'categoryName', render: (name?: string) => name || <Tag>N/A</Tag> },
    { title: 'Stock', dataIndex: ['inventoryItem', 'quantity'], key: 'stock', align: 'center' as 'center', sorter: (a: ProductListData, b: ProductListData) => (a.inventoryItem?.quantity ?? 0) - (b.inventoryItem?.quantity ?? 0) },
    { title: 'Base Price', key: 'basePrice', align: 'right' as 'right', sorter: (a: ProductListData, b: ProductListData) => a.price - b.price, render: (_: any, record: ProductListData) => { let basePrice: number; const totalTaxRate = record.taxes?.reduce((sum, tax) => sum + tax.rate, 0) || 0; if (pricesEnteredWithTax) { basePrice = totalTaxRate > 0 ? record.price / (1 + totalTaxRate / 100) : record.price; } else { basePrice = record.price; } return `${currencySymbol}${basePrice.toFixed(2)}`; }},
    { title: 'Taxes', dataIndex: 'taxes', key: 'taxes', render: (taxes: TaxInfo[]) => ( <Space direction="vertical" size="small"> {taxes && taxes.length > 0 ? taxes.map(tax => <Tag key={tax.id}>{tax.name} ({tax.rate}%)</Tag>) : <Text type="secondary">None</Text>} </Space> )},
    { title: 'Price (inc. Tax)', key: 'totalPrice', align: 'right' as 'right', render: (_: any, record: ProductListData) => { let finalPrice: number; const totalTaxRate = record.taxes?.reduce((sum, tax) => sum + tax.rate, 0) || 0; if (pricesEnteredWithTax) { finalPrice = record.price; } else { finalPrice = record.price * (1 + totalTaxRate / 100); } return <Text strong>{currencySymbol}{finalPrice.toFixed(2)}</Text>; }},
    { title: 'Actions', key: 'actions', align: 'center' as 'center', width: 100, fixed: 'right' as 'right', render: (_: any, record: ProductListData) => (
        <Space size="small">
          {hasRole([Role.ADMIN, Role.MANAGER]) && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)} /></Tooltip>}
          {hasRole([Role.ADMIN]) && <Popconfirm title={`Delete "${record.name}"?`} onConfirm={() => handleDelete(record)} okText="Yes, Delete" okButtonProps={{ loading: deleteLoading }}><Tooltip title="Delete"><Button size="small" icon={<DeleteOutlined />} danger /></Tooltip></Popconfirm>}
        </Space>
    )},
  ];

  // --- Render logic for Mobile View (List of Cards) ---
  const renderMobileList = () => (
    <List
      loading={loading}
      grid={{ gutter: 16, xs: 1, sm: 2 }}
      dataSource={filteredProducts}
      renderItem={(product) => {
        const fullImageUrl = product.imageUrls && product.imageUrls.length > 0 ? `${import.meta.env.VITE_API_URL}${product.imageUrls[0]}` : null;
        let finalPrice: number;
        const totalTaxRate = product.taxes?.reduce((sum, tax) => sum + tax.rate, 0) || 0;
        if (pricesEnteredWithTax) { finalPrice = product.price; } else { finalPrice = product.price * (1 + totalTaxRate / 100); }

        return (
          <List.Item>
            <Card
              hoverable
              actions={[
                <Tooltip title="Edit Product"><Button type="text" icon={<EditOutlined />} onClick={() => showEditModal(product)} /></Tooltip>,
                <Popconfirm title={`Delete "${product.name}"?`} onConfirm={() => handleDelete(product)} okText="Yes, Delete" okButtonProps={{ loading: deleteLoading }}><Tooltip title="Delete Product"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm>
              ]}
            >
              <Card.Meta
                avatar={fullImageUrl ? <Image width={60} src={fullImageUrl} /> : <div style={{width: 60, height: 60, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} /></div>}
                title={<Title level={5}>{product.name}</Title>}
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text type="secondary">SKU: {product.sku || 'N/A'}</Text>
                    <div><Text strong>Price: </Text><Text strong style={{color: '#1890ff'}}>{currencySymbol}{finalPrice.toFixed(2)}</Text> <Text type="secondary">(inc. tax)</Text></div>
                    <div><Text strong>Stock: </Text><Tag color={(product.inventoryItem?.quantity ?? 0) > 10 ? 'green' : 'red'}>{product.inventoryItem?.quantity ?? 'N/A'}</Tag></div>
                    <div><Text strong>Category: </Text><Tag>{product.category?.name || 'N/A'}</Tag></div>
                  </Space>
                }
              />
            </Card>
          </List.Item>
        );
      }}
    />
  );

  return (
    <div>
      <Row gutter={[16, 16]} justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Product Management</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
            Add Product
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by name, SKU, or category..."
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
          allowClear
        />
      </Card>
      
      {/* Conditionally render Table for desktop or List for mobile */}
      {screens.md ? (
        <Table
          columns={desktopColumns}
          dataSource={filteredProducts}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 'max-content' }}
        />
      ) : (
        renderMobileList()
      )}

      <ProductFormModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
        productToEdit={editingProduct}
      />
    </div>
  );
};

export default ProductListPage;