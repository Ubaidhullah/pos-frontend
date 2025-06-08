import React from 'react';
import { Modal, Table, Spin, Alert, Typography, Tag, Button } from 'antd';
import { useQuery } from '@apollo/client';
import dayjs from 'dayjs';
import { GET_INVENTORY_ADJUSTMENT_HISTORY } from '../../apollo/queries/inventoryAdjustmentQueries';
import { InventoryAdjustmentReason } from '../../common/enums/inventory-adjustment-reason.enum'; // Frontend enum

const {  Text } = Typography;

interface ProductInfo {
  id: string;
  name: string;
}

interface UserInfo {
  name?: string;
  email: string;
}

interface AdjustmentData {
  id: string;
  quantityChange: number;
  newQuantity: number;
  reason: InventoryAdjustmentReason;
  notes?: string;
  createdAt: string;
  user?: UserInfo;
}

interface AdjustmentHistoryModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductInfo | null;
}

const AdjustmentHistoryModal: React.FC<AdjustmentHistoryModalProps> = ({ open, onClose, product }) => {
  const { data, loading, error } = useQuery<{ inventoryAdjustmentHistory: AdjustmentData[] }>(
    GET_INVENTORY_ADJUSTMENT_HISTORY,
    {
      variables: { productId: product?.id },
      skip: !open || !product, // Don't run query if modal is closed or no product is selected
      fetchPolicy: 'network-only', // Always get fresh history
    }
  );

  const reasonColors: { [key in InventoryAdjustmentReason]?: string } = {
    [InventoryAdjustmentReason.SALE]: 'red',
    [InventoryAdjustmentReason.DAMAGE]: 'red',
    [InventoryAdjustmentReason.THEFT]: 'red',
    [InventoryAdjustmentReason.PO_RECEIPT]: 'green',
    [InventoryAdjustmentReason.INITIAL_STOCK]: 'cyan',
    [InventoryAdjustmentReason.RETURN]: 'green',
    [InventoryAdjustmentReason.MANUAL_ADJUSTMENT]: 'blue',
  };

  const columns = [
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss') },
    { title: 'User', dataIndex: ['user', 'name'], key: 'user', render: (name?: string, record?: AdjustmentData) => name || record?.user?.email || <Text type="secondary">System</Text>},
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (reason: InventoryAdjustmentReason) => <Tag color={reasonColors[reason] || 'default'}>{reason.replace('_', ' ')}</Tag>},
    { title: 'Change', dataIndex: 'quantityChange', key: 'change', align: 'right' as 'right', render: (change: number) => <Text type={change > 0 ? 'success' : 'danger'}>{change > 0 ? `+${change}` : change}</Text> },
    { title: 'New Qty', dataIndex: 'newQuantity', key: 'newQty', align: 'right' as 'right', render: (qty: number) => <Text strong>{qty}</Text> },
    { title: 'Notes', dataIndex: 'notes', key: 'notes' },
  ];

  let modalContent;
  if (loading) {
    modalContent = <div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Loading history..." /></div>;
  } else if (error) {
    modalContent = <Alert message="Error loading history" description={error.message} type="error" showIcon />;
  } else {
    modalContent = (
      <Table
        columns={columns}
        dataSource={data?.inventoryAdjustmentHistory}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
      />
    );
  }

  return (
    <Modal
      title={<>Inventory History for <Text type="success">{product?.name}</Text></>}
      open={open}
      onCancel={onClose}
      footer={[<Button key="close" onClick={onClose}>Close</Button>]}
      width={900}
    >
      {modalContent}
    </Modal>
  );
};

export default AdjustmentHistoryModal;