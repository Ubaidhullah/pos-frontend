import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Button, message, Tooltip, Typography, Tag, Input, Space } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import { GET_PRODUCTS_WITH_INVENTORY } from '../../apollo/queries/productQueries'; // Or your main GET_PRODUCTS
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import SetStockModal from './SetStockModal'; // Import the modal

const { Title } = Typography;
const { Search } = Input;

interface CategoryInfo { id: string; name: string; }
interface InventoryItemData { id: string; quantity: number; updatedAt: string; }
interface ProductWithInventory {
  id: string;
  name: string;
  sku: string;
  price: number;
  category?: CategoryInfo;
  inventoryItem?: InventoryItemData;
}

// Type for product data passed to the modal
interface ProductDataForModal {
    id: string;
    name: string;
    currentQuantity: number;
}

const InventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, loading, error, refetch } = useQuery<{ products: ProductWithInventory[] }>(
    GET_PRODUCTS_WITH_INVENTORY,
    // You might want to add variables for server-side search/filtering if implemented
  );
  const { hasRole } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productForStockUpdate, setProductForStockUpdate] = useState<ProductDataForModal | null>(null);

  const showSetStockModal = (product: ProductWithInventory) => {
    setProductForStockUpdate({
        id: product.id,
        name: product.name,
        currentQuantity: product.inventoryItem?.quantity ?? 0
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setProductForStockUpdate(null);
    // refetch(); // Modal's onCompleted already refetches the product list
  };

  if (error) {
    message.error(`Error loading inventory data: ${error.message}`);
    return <p>Error loading inventory. Check console.</p>;
  }

  // Client-side filtering based on search term
  const filteredProducts = data?.products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const columns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name', sorter: (a: ProductWithInventory, b: ProductWithInventory) => a.name.localeCompare(b.name) },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Category', dataIndex: ['category', 'name'], key: 'categoryName', render: (name?: string) => name || <Tag>N/A</Tag> },
    {
      title: 'Current Stock',
      dataIndex: ['inventoryItem', 'quantity'],
      key: 'stockQuantity',
      render: (quantity?: number) => (quantity === null || quantity === undefined) ? <Tag color="orange">No Inv. Record</Tag> : <Tag color={quantity > 0 ? 'green' : 'red'}>{quantity}</Tag>,
      sorter: (a: ProductWithInventory, b: ProductWithInventory) => (a.inventoryItem?.quantity ?? -1) - (b.inventoryItem?.quantity ?? -1), // Sort N/A last
    },
    {
      title: 'Stock Last Updated',
      dataIndex: ['inventoryItem', 'updatedAt'],
      key: 'stockUpdatedAt',
      render: (date?: string) => date ? moment(date).format('YYYY-MM-DD HH:mm') : 'N/A',
      sorter: (a: ProductWithInventory, b: ProductWithInventory) => moment(a.inventoryItem?.updatedAt).unix() - moment(b.inventoryItem?.updatedAt).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ProductWithInventory) => (
        <Space size="middle">
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Tooltip title="Set Stock Quantity">
              <Button icon={<EditOutlined />} onClick={() => showSetStockModal(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Inventory Management</Title>
        {/* No "Add" button here as inventory is tied to products */}
      </div>
      <Search
        placeholder="Search by product name or SKU"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: 16, width: 300 }}
        allowClear
        enterButton={<Button icon={<SearchOutlined />}>Search</Button>}
      />
      <Table
        columns={columns}
        dataSource={filteredProducts} // Use filtered data
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
      />
      {productForStockUpdate && ( // Ensure modal is only rendered when there's data for it
         <SetStockModal
            open={isModalOpen}
            onClose={handleModalClose}
            productToUpdate={productForStockUpdate}
        />
      )}
    </div>
  );
};

export default InventoryPage;