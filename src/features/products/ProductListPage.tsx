import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, Modal, message, Tag, Typography, Popconfirm, Flex } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { DELETE_PRODUCT } from '../../apollo/mutations/productMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import ProductForm from './ProductForm';
//import ProductFormModal from './ProductFormModal'; // We'll create this next

const { Title } = Typography;

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  priceIncTax?: number;
  standardCostPrice: number;
  category?: { name: string; };
  inventoryItem?: { quantity: number; };
  taxes: { name: string; }[]; // Array of taxes
}

const ProductListPage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<{ products: Product[] }>(GET_PRODUCTS);
  const [deleteProductMutation, { loading: deleteLoading }] = useMutation(DELETE_PRODUCT);
  const { hasRole } = useAuth();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const showAddModal = () => {
    setEditingProduct(null);
    setIsModalVisible(true);
  };

  const showEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalVisible(true);
  };

  const handleModalClose = (shouldRefetch?: boolean) => {
    setIsModalVisible(false);
    setEditingProduct(null);
    if (shouldRefetch) {
      refetch();
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteProductMutation({
        variables: { id: productId },
        refetchQueries: [{ query: GET_PRODUCTS }],
      });
      message.success('Product deleted successfully');
    } catch (e: any) {
      message.error(`Error deleting product: ${e.message}`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' /* ... */ },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Category', dataIndex: ['category', 'name'], key: 'categoryName', render: (name?: string) => name || <Tag>N/A</Tag> },
    { title: 'Stock', dataIndex: ['inventoryItem', 'quantity'], key: 'stock', render: (qty?: number) => qty ?? <Tag>N/A</Tag> },
    { title: 'Price (ex. Tax)', dataIndex: 'price', key: 'price', render: (price: number) => `$${price.toFixed(2)}` },
    { title: 'Taxes', dataIndex: 'taxes', key: 'taxes', render: (taxes: {name: string}[]) => taxes.map(t => <Tag key={t.name}>{t.name}</Tag>) },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space size="middle">
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Button icon={<EditOutlined />} onClick={() => showEditModal(record)}>Edit</Button>
          )}
          {hasRole([Role.ADMIN]) && (
            <Popconfirm
              title="Delete the product"
              description="Are you sure you want to delete this product?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              disabled={deleteLoading}
            >
              <Button icon={<DeleteOutlined />} danger loading={deleteLoading}>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (error) {
    message.error(`Error loading products: ${error.message}`);
    return <p>Error loading products.</p>; // Or a more sophisticated error display
  }

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Product Management</Title>
        {hasRole([Role.ADMIN, Role.MANAGER]) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            Add New Product
          </Button>
        )}
      </Flex>
      <Table
        columns={columns}
        dataSource={data?.products}
        loading={loading}
        rowKey="id"
        // pagination={{ pageSize: 10 }} // Example pagination
      />
      {/* The ProductForm modal, its behavior determined by editingProduct */}
      <ProductForm
        open={isModalVisible}
        onClose={handleModalClose}
        // productToEdit={editingProduct} // Pass null for create, or product object for edit
      />
    
    </div>
  );
};

export default ProductListPage;