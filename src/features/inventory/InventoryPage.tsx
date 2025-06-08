import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Button, message, Tooltip, Typography, Tag, Input, Space } from 'antd'; // Add Space
import { EditOutlined, HistoryOutlined, PlusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { GET_PRODUCTS_WITH_INVENTORY } from '../../apollo/queries/productQueries';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import SetStockModal from './SetStockModal';
import AdjustmentHistoryModal from './AdjustmentHistoryModal'; // 👈 Import History Modal
import ManualAdjustmentFormModal from './ManualAdjustmentFormModal'; // 👈 Import Adjustment Form Modal

const { Title } = Typography;
const { Search } = Input;

// --- Interfaces (same as before) ---
interface ProductWithInventory {
  id: string;
  name: string;
  sku: string;
  inventoryItem?: { quantity: number; updatedAt: string; };
  // ...other fields if needed
}

const InventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, loading, error, refetch } = useQuery<{ products: ProductWithInventory[] }>(GET_PRODUCTS_WITH_INVENTORY);
  const { hasRole } = useAuth();

  // --- State for all three modals ---
  const [isSetStockModalOpen, setIsSetStockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isManualAdjModalOpen, setIsManualAdjModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; currentQuantity: number; } | null>(null);

  // --- Modal control functions ---
  const openSetStockModal = (product: ProductWithInventory) => {
    setSelectedProduct({ id: product.id, name: product.name, currentQuantity: product.inventoryItem?.quantity ?? 0 });
    setIsSetStockModalOpen(true);
  };
  const openHistoryModal = (product: ProductWithInventory) => {
    setSelectedProduct({ id: product.id, name: product.name, currentQuantity: product.inventoryItem?.quantity ?? 0 });
    setIsHistoryModalOpen(true);
  };
  const openManualAdjModal = (product: ProductWithInventory) => {
    setSelectedProduct({ id: product.id, name: product.name, currentQuantity: product.inventoryItem?.quantity ?? 0 });
    setIsManualAdjModalOpen(true);
  };

  if (error) message.error(`Error loading inventory data: ${error.message}`);

  const filteredProducts = data?.products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ProductWithInventory) => (
        <Space size="small">
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Tooltip title="View History">
              <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistoryModal(record)} />
            </Tooltip>
          )}
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Tooltip title="Manual Adjustment">
              <Button size="small" icon={<PlusCircleOutlined />} onClick={() => openManualAdjModal(record)} />
            </Tooltip>
          )}
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Tooltip title="Set Stock (Override)">
              <Button size="small" icon={<EditOutlined />} onClick={() => openSetStockModal(record)} />
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
      </div>
      <Search
        placeholder="Search by product name or SKU"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: 16, width: 300 }}
        allowClear
      />
      <Table
        columns={columns}
        dataSource={filteredProducts}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
      />
      
      {/* --- Modals --- */}
      {selectedProduct && (
        <>
          <SetStockModal
            open={isSetStockModalOpen}
            onClose={() => setIsSetStockModalOpen(false)}
            productToUpdate={selectedProduct}
          />
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