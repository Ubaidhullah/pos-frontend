import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Button, message, Tooltip, Typography, Tag, Input, Space, Alert, Card } from 'antd'; // Add Space
import { EditOutlined, HistoryOutlined, PlusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { GET_PRODUCTS_WITH_INVENTORY } from '../../apollo/queries/productQueries';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
// import SetStockModal from './SetStockModal';
import AdjustmentHistoryModal from './AdjustmentHistoryModal'; 
import ManualAdjustmentFormModal from './ManualAdjustmentFormModal'; 

const { Title } = Typography;
const { Search } = Input;


interface ProductWithInventory {
  id: string;
  name: string;
  sku: string;
  inventoryItem?: { quantity: number; updatedAt: string; };
}

interface ProductDataForModal {
    id: string;
    name: string;
    currentQuantity: number;
}


const InventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, loading, error, refetch } = useQuery<{ products: ProductWithInventory[] }>(GET_PRODUCTS_WITH_INVENTORY);
  const { hasRole } = useAuth();

  // --- State for all three modals ---
  // const [isSetStockModalOpen, setIsSetStockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isManualAdjModalOpen, setIsManualAdjModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDataForModal | null>(null);
  // --- Modal control functions ---
  // const openSetStockModal = (product: ProductWithInventory) => {
  //   setSelectedProduct({ id: product.id, name: product.name, currentQuantity: product.inventoryItem?.quantity ?? 0 });
  //   setIsSetStockModalOpen(true);
  // };
  const openHistoryModal = (product: ProductWithInventory) => {
    setSelectedProduct({ id: product.id, name: product.name, currentQuantity: product.inventoryItem?.quantity ?? 0 });
    setIsHistoryModalOpen(true);
  };
  const openManualAdjModal = (product: ProductWithInventory) => {
    setSelectedProduct({ id: product.id, name: product.name, currentQuantity: product.inventoryItem?.quantity ?? 0 });
    setIsManualAdjModalOpen(true);
  };

  if (error) message.error(`Error loading inventory data: ${error.message}`);


  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    if (!searchTerm) return data.products;
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.products.filter(p => p.name.toLowerCase().includes(lowercasedTerm) || p.sku.toLowerCase().includes(lowercasedTerm));
  }, [data, searchTerm]);

  if (error) message.error(`Error loading inventory: ${error.message}`);
  if (!hasRole([Role.ADMIN, Role.MANAGER])) return <Alert message="Access Denied" type="error" />;

  const columns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name', sorter: (a: { name: string; }, b: { name: any; }) => a.name.localeCompare(b.name) },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    {
      title: 'Current Stock',
      dataIndex: ['inventoryItem', 'quantity'],
      key: 'stockQuantity',
      render: (quantity?: number) => <Tag color={quantity !== undefined && quantity > 10 ? 'green' : quantity !== undefined && quantity > 0 ? 'orange' : 'red'}>{quantity ?? 'N/A'}</Tag>,
      sorter: (a: ProductWithInventory, b: ProductWithInventory) => (a.inventoryItem?.quantity ?? -1) - (b.inventoryItem?.quantity ?? -1),
    },
    {
      title: 'Stock Last Updated',
      dataIndex: ['inventoryItem', 'updatedAt'],
      key: 'stockUpdatedAt',
      render: (date?: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : 'N/A',
      sorter: (a: ProductWithInventory, b: ProductWithInventory) => dayjs(a.inventoryItem?.updatedAt ?? 0).unix() - dayjs(b.inventoryItem?.updatedAt ?? 0).unix(),
    },
     {
      title: 'Actions', key: 'actions',
      render: (_: any, record: ProductWithInventory) => (
        <Space size="small">
          <Tooltip title="View Stock History">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistoryModal(record)} />
          </Tooltip>
          <Tooltip title="Manual Stock Adjustment">
            <Button size="small" icon={<EditOutlined />} onClick={() => openManualAdjModal(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Inventory Management</Title>
      <Card style={{ marginBottom: 16 }}>
        <Search
          placeholder="Search by product name or SKU"
          onSearch={setSearchTerm}
          onChange={(e) => !e.target.value && setSearchTerm('')}
          style={{ width: 300 }}
          allowClear
        />
      </Card>
      <Table
        columns={columns}
        dataSource={filteredProducts}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
        bordered
      />
      
      {selectedProduct && (
        <>
          <AdjustmentHistoryModal
            open={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            product={selectedProduct}
          />
          <ManualAdjustmentFormModal
            open={isManualAdjModalOpen}
            onClose={() => setIsManualAdjModalOpen(false)}
            productToAdjust={selectedProduct}
          />
        </>
      )}
    </div>
  );
};

export default InventoryPage;