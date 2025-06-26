import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, message, Popconfirm, Tooltip, Typography, Tag, Image, Empty, Input, Card  } from 'antd'; 
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { DELETE_PRODUCT } from '../../apollo/mutations/productMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import ProductFormModal, { type ProductToEdit } from './ProductForm';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';


const { Title, Text } = Typography;

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
      product.sku.toLowerCase().includes(lowercasedTerm) ||
      product.category?.name.toLowerCase().includes(lowercasedTerm)
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

  // --- Corrected Columns Definition ---
  const columns = [
    {
        title: 'Image',
        dataIndex: 'imageUrls',
        key: 'image',
        width: 80,
        render: (imageUrls: string[]) => {
            if (!imageUrls || imageUrls.length === 0) {
                return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />;
            }
            // --- FIX IS HERE ---
            // Construct the full, absolute URL using the environment variable.
            const fullImageUrl = `${import.meta.env.VITE_API_URL}${imageUrls[0]}`;
            
            return (
                <Image
                    width={50}
                    src={fullImageUrl} // Use the correctly constructed URL
                    preview={{ src: fullImageUrl }} 
                />
            );
        }
    },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: ProductListData, b: ProductListData) => a.name.localeCompare(b.name) },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Category', dataIndex: ['category', 'name'], key: 'categoryName', render: (name?: string) => name || <Tag>N/A</Tag> },
    { title: 'Stock', dataIndex: ['inventoryItem', 'quantity'], key: 'stock', align: 'center' as 'center', sorter: (a: ProductListData, b: ProductListData) => (a.inventoryItem?.quantity ?? 0) - (b.inventoryItem?.quantity ?? 0) },
    // Corrected 'Base Price' column with explicit logic
          {
                title: 'Base Price',
                key: 'basePrice',
                align: 'right' as 'right',
                sorter: (a: ProductListData, b: ProductListData) => a.price - b.price,
                render: (_: any, record: ProductListData) => {
                  let basePrice: number;

                  const totalTaxRate = record.taxes?.reduce((sum, tax) => sum + tax.rate, 0) || 0;

                  if (pricesEnteredWithTax) {
                    // Avoid division by 0
                    if (totalTaxRate > 0) {
                      basePrice = record.price / (1 + totalTaxRate / 100);
                    } else {
                      basePrice = record.price;
                    }
                  } else {
                    basePrice = record.price;
                  }

                  // Round properly
                  return `${currencySymbol}${basePrice.toFixed(2)}`;
                }
              }
      ,
    {
        title: 'Taxes',
        dataIndex: 'taxes',
        key: 'taxes',
        render: (taxes: TaxInfo[]) => (
            <Space direction="vertical" size="small">
                {taxes && taxes.length > 0 ? (
                    taxes.map(tax => <Tag key={tax.id}>{tax.name} ({tax.rate}%)</Tag>)
                ) : (
                    <Text type="secondary">None</Text>
                )}
            </Space>
        )
    },
    {
          title: 'Price (inc. Tax)',
          key: 'totalPrice',
          align: 'right' as 'right',
          render: (_: any, record: ProductListData) => {
            let finalPrice: number;

            const totalTaxRate = record.taxes?.reduce((sum, tax) => sum + tax.rate, 0) || 0;

            if (pricesEnteredWithTax) {
              finalPrice = record.price;
            } else {
              finalPrice = record.price * (1 + totalTaxRate / 100);
            }

            return <Text strong>{currencySymbol}{finalPrice.toFixed(2)}</Text>;
          }
        },
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
        dataSource={filteredProducts}
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
