import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, message, Popconfirm, Tooltip, Typography, Tag, Image, Empty, Input, Card  } from 'antd'; 
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { DELETE_PRODUCT } from '../../apollo/mutations/productMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import ProductFormModal, { type ProductToEdit } from './ProductForm'; // We'll update the interface

const { Title } = Typography;

// 👇 Update the interface to include imageUrls
interface ProductListData {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrls: string[]; // <-- The array of image URLs
  category?: { name: string; };
  inventoryItem?: { quantity: number; };
  taxes: { name: string; }[];
}

const ProductListPage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<{ products: ProductListData[] }>(GET_PRODUCTS);
  const [deleteProductMutation, { loading: deleteLoading }] = useMutation(DELETE_PRODUCT);
  const { hasRole, user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductToEdit | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); 

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    if (!searchTerm) return data.products;
    
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.products.filter(product =>
      product.name.toLowerCase().includes(lowercasedTerm) ||
      product.sku.toLowerCase().includes(lowercasedTerm) ||
      product.category?.name.toLowerCase().includes(lowercasedTerm)
    );
  }, [data, searchTerm]);
  
  if (error) {
    message.error(`Error loading products: ${error.message}`);
  }

  const handleDelete = async (product: ProductListData) => {
    try {
      // Pass the current user to the service via the resolver for audit logging
      await deleteProductMutation({
        variables: { id: product.id }, // The resolver will get the user from context
        refetchQueries: [{ query: GET_PRODUCTS }],
      });
      message.success(`Product "${product.name}" deleted successfully`);
    } catch (e: any) {
      message.error(`Error deleting product: ${e.message}`);
    }
  };

  const showEditModal = (product: ProductListData) => {
    // Map the list data to the shape the form expects
    const productToEdit: ProductToEdit = {
      ...product,
      categoryId: (product as any).category?.id, // Get categoryId if it exists in your full query for editing
      taxes: (product as any).taxes?.map((t: any) => ({id: t.id})),
    };
    setEditingProduct(productToEdit);
    setIsModalOpen(true);
  };


  const columns = [
    // 👇 NEW "Image" COLUMN
    {
        title: 'Image',
        dataIndex: 'imageUrls',
        key: 'image',
        width: 80,
        render: (imageUrls: string[]) => (
            imageUrls && imageUrls.length > 0 ? (
                <Image
                    width={50}
                    src={imageUrls[0]} // Show the first image as a thumbnail
                    preview={{ src: imageUrls[0] }} // Clicking it will show a larger preview
                />
            ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
            )
        )
    },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: ProductListData, b: ProductListData) => a.name.localeCompare(b.name) },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Category', dataIndex: ['category', 'name'], key: 'categoryName', render: (name?: string) => name || <Tag>N/A</Tag> },
    { title: 'Stock', dataIndex: ['inventoryItem', 'quantity'], key: 'stock', align: 'center' as 'center', sorter: (a: ProductListData, b: ProductListData) => (a.inventoryItem?.quantity ?? 0) - (b.inventoryItem?.quantity ?? 0) },
    { title: 'Price', dataIndex: 'price', key: 'price', align: 'right' as 'right', render: (price: number) => `$${price.toFixed(2)}`, sorter: (a: { price: number; }, b: { price: number; }) => a.price - b.price },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as 'center',
      render: (_: any, record: ProductListData) => (
        <Space size="small">
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Tooltip title="Edit Product">
              <Button size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)} />
            </Tooltip>
          )}
          {hasRole([Role.ADMIN]) && (
            <Popconfirm
              title={`Delete "${record.name}"?`}
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record)}
              okText="Yes, Delete"
              okButtonProps={{ loading: deleteLoading }}
            >
              <Tooltip title="Delete Product">
                <Button size="small" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Product Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
          Add Product
        </Button>
      </div>

      {/* 👇 New Search Input */}
      <Card style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by name, SKU, or category..."
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
          allowClear
        />
      </Card>

      <Table
        columns={columns}
        dataSource={filteredProducts} // 👈 Use the filtered list
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
      />
      <ProductFormModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
        productToEdit={editingProduct}
      />
    </div>
  );
};

export default ProductListPage;