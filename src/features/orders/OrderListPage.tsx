import React, { useState, useMemo } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, DatePicker, Select, Space, Modal, List, Typography, message, Tooltip } from 'antd';
import { EyeOutlined, DownloadOutlined, DollarCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { GET_ORDERS } from '../../apollo/queries/orderQueries';
import { EXPORT_ORDERS_AS_CSV } from '../../apollo/queries/exportQueries';
import { useAuth } from '../../contexts/AuthContext';
import AddPaymentModal from '../pos/AddPaymentModal';
import { Role } from '../../common/enums/role.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
// 1. Import GET_SETTINGS to fetch currency data
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

interface ProductItemInfo { id: string; name: string; }
interface OrderItemData { id: string; product: ProductItemInfo; quantity: number; priceAtSale: number; }
interface UserInfo { id:string; name?: string; email: string; }
interface CustomerInfo { id: string; name: string; }

interface OrderData {
  billNumber: string;
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: UserInfo;
  customer?: CustomerInfo;
  items: OrderItemData[];
}

interface SettingsData {
  displayCurrency?: string;
  baseCurrency?: string;
}

const orderStatusColors: { [key: string]: string } = {
  PENDING: 'gold',
  COMPLETED: 'green',
  CANCELLED: 'red',
  PROCESSING: 'blue',
  RETURNED: 'purple',
  LAYAWAY: 'orange',
};

const OrderListPage: React.FC = () => {
  const [filters, setFilters] = useState<{
    dateRange?: [Dayjs | null, Dayjs | null];
    status?: string;
  }>({});

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const navigate = useNavigate();

  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
    const [selectedPOForAction, setSelectedPOForAction] = useState<any | null>(null);

    const openAddPaymentModal = (order: any) => {
        setSelectedPOForAction(order);
        setIsAddPaymentModalOpen(true);
    };

  const { hasRole } = useAuth();

  // 2. Add the useQuery hook for settings
  const { data: settingsData } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);

  const queryVariables: any = {};
  if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
    queryVariables.startDate = filters.dateRange[0].startOf('day').toISOString();
    queryVariables.endDate = filters.dateRange[1].endOf('day').toISOString();
  }
  if (filters.status) {
    queryVariables.status = filters.status;
  }

  const { data, loading, error, refetch } = useQuery<{ orders: OrderData[] }>(GET_ORDERS, {
    variables: queryVariables,
    notifyOnNetworkStatusChange: true,
  });

  // 3. Define the currencySymbol with fallbacks
  const currencySymbol = useMemo(() => {
    return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
  }, [settingsData]);

  const [exportOrders, { loading: exportLoading }] = useLazyQuery<
    { exportOrdersAsCSV: string },
    { startDate?: string; endDate?: string; status?: string }
  >(EXPORT_ORDERS_AS_CSV, {
    onCompleted: (exportData) => {
      if (exportData?.exportOrdersAsCSV) {
        const blob = new Blob([exportData.exportOrdersAsCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `orders-${dayjs().format('YYYY-MM-DD')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('Order data exported successfully.');
      } else {
        message.warning('No data to export.');
      }
    },
    onError: (err) => {
      message.error(`Export failed: ${err.message}`);
    },
    fetchPolicy: 'no-cache',
  });

  const handleExport = () => {
    exportOrders({ variables: queryVariables });
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setFilters(prev => ({ ...prev, dateRange: dates || undefined }));
  };

  const handleStatusChange = (value?: string) => {
    setFilters(prev => ({ ...prev, status: value }));
  };

  const handleApplyFilters = () => {
    refetch(queryVariables);
  };

  const showOrderDetailModal = (order: OrderData) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  if (error) message.error(`Error loading orders: ${error.message}`);

  const columns = [
   {
    title: 'Bill No',
    dataIndex: 'billNumber',
    key: 'billNumber',
    render: (id: string) => (
      <Space>
        <Tooltip title={id}>
          <code>{id.slice(0, 8)}...</code>
        </Tooltip>
        <Text copyable={{ text: id }} />
      </Space>
    ),
   },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm') },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customerName', render: (name?: string) => name || <Text type="secondary">N/A</Text> },
    { title: 'Cashier', dataIndex: ['user', 'name'], key: 'userName', render: (name?: string, record?: OrderData) => name || record?.user.email },
    // 4. Update the table column to use the dynamic symbol
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount: number) => `${currencySymbol}${amount.toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={orderStatusColors[status] || 'default'}>{status.toUpperCase()}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: OrderData) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            Details
          </Button>
    
          {hasRole([Role.ADMIN, Role.MANAGER, Role.CASHIER]) &&
            record.status === OrderStatus.LAYAWAY && (
              <Tooltip title="Add Payment">
                <Button
                  size="small"
                  icon={<DollarCircleOutlined />}
                  onClick={() => openAddPaymentModal(record)}
                />
              </Tooltip>
            )}
        </Space>
      ),
    }
  ];

  return (
    <div>
      <Title level={2}>Order History</Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker onChange={handleDateChange} value={filters.dateRange} />
        <Select
          placeholder="Filter by Status"
          onChange={handleStatusChange}
          style={{ width: 150 }}
          allowClear
          value={filters.status}
        >
          {Object.keys(orderStatusColors).map(status => (
            <Option key={status} value={status}>{status}</Option>
          ))}
        </Select>
        <Button type="primary" onClick={handleApplyFilters} loading={loading}>Apply Filters</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exportLoading}>
          Export to CSV
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.orders}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />
      
      {/* 5. Update the modal to use the dynamic symbol */}
      <Modal
        title={`Order Details - ID: ${selectedOrder?.id.slice(0, 8)}...`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={<Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>}
        width={600}
      >
        {selectedOrder && (
          <>
            <p><strong>Date:</strong> {dayjs(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            <p><strong>Customer:</strong> {selectedOrder.customer?.name || 'N/A'}</p>
            <p><strong>Cashier:</strong> {selectedOrder.user.name || selectedOrder.user.email}</p>
            <p><strong>Status:</strong> <Tag color={orderStatusColors[selectedOrder.status] || 'default'}>{selectedOrder.status.toUpperCase()}</Tag></p>
            <p><strong>Total Amount:</strong> {currencySymbol}{selectedOrder.totalAmount.toFixed(2)}</p>

            <List
              dataSource={selectedOrder.items}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.product.name}
                    description={`Qty: ${item.quantity} @ ${currencySymbol}${item.priceAtSale.toFixed(2)}`}
                  />
                  <div>{currencySymbol}{(item.quantity * item.priceAtSale).toFixed(2)}</div>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
      <AddPaymentModal
                open={isAddPaymentModalOpen}
                onClose={() => setIsAddPaymentModalOpen(false)}
                order={selectedPOForAction}
            />
    </div>
  );
};

export default OrderListPage;
