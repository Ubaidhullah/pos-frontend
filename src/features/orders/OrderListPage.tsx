import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Tag, Button, DatePicker, Select, Space, Modal, List, Typography, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import moment from 'moment'; // For date formatting
import { GET_ORDERS } from '../../apollo/queries/orderQueries';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum'; // If needed for filtering/actions

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

interface ProductItemInfo { id: string; name: string; }
interface OrderItemData { id: string; product: ProductItemInfo; quantity: number; priceAtSale: number; }
interface UserInfo { id: string; name?: string; email: string; }
interface CustomerInfo { id: string; name: string; }

interface OrderData {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string; // Or Date object if GraphQLISODateTime is used and parsed
  user: UserInfo;
  customer?: CustomerInfo;
  items: OrderItemData[];
}

const OrderListPage: React.FC = () => {
  const [filters, setFilters] = useState<{
    dateRange?: [moment.Moment | null, moment.Moment | null];
    status?: string;
  }>({});
  const { hasRole } = useAuth(); // For role-specific actions if any

  const queryVariables: any = {};
  if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
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

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  const handleDateChange = (dates: any, dateStrings: [string, string]) => {
    if (dates) {
      setFilters(prev => ({ ...prev, dateRange: dates }));
    } else {
      setFilters(prev => ({ ...prev, dateRange: undefined }));
    }
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

  const orderStatusColors: { [key: string]: string } = {
    PENDING: 'gold',
    COMPLETED: 'green',
    CANCELLED: 'red',
    PROCESSING: 'blue',
    // Add more statuses and their colors
  };

  const columns = [
    { title: 'Order ID', dataIndex: 'id', key: 'id', render: (id: string) => <code>{id.substring(0, 8)}...</code> },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => moment(date).format('YYYY-MM-DD HH:mm'), sorter: (a: OrderData, b: OrderData) => moment(a.createdAt).unix() - moment(b.createdAt).unix() },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customerName', render: (name?: string) => name || <Text type="secondary">N/A</Text> },
    { title: 'Cashier', dataIndex: ['user', 'name'], key: 'userName', render: (name?: string, record?: OrderData) => name || record?.user.email || <Text type="secondary">N/A</Text> },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount: number) => `$${amount.toFixed(2)}`, sorter: (a: OrderData, b: OrderData) => a.totalAmount - b.totalAmount },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={orderStatusColors[status] || 'default'}>{status.toUpperCase()}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: OrderData) => (
        <Button icon={<EyeOutlined />} onClick={() => showOrderDetailModal(record)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Order History</Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker onChange={handleDateChange} />
        <Select
          placeholder="Filter by Status"
          onChange={handleStatusChange}
          style={{ width: 150 }}
          allowClear
          value={filters.status}
        >
          <Option value="PENDING">Pending</Option>
          <Option value="COMPLETED">Completed</Option>
          <Option value="CANCELLED">Cancelled</Option>
          {/* Add other statuses */}
        </Select>
        <Button type="primary" onClick={handleApplyFilters} loading={loading}>Apply Filters</Button>
      </Space>
      <Table
        columns={columns}
        dataSource={data?.orders}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />
      <Modal
        title={`Order Details - ID: ${selectedOrder?.id.substring(0,8)}...`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[<Button key="close" onClick={() => setIsDetailModalOpen(false)}>Close</Button>]}
        width={600}
      >
        {selectedOrder && (
          <>
            <p><strong>Date:</strong> {moment(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            <p><strong>Customer:</strong> {selectedOrder.customer?.name || 'N/A'}</p>
            <p><strong>Cashier:</strong> {selectedOrder.user.name || selectedOrder.user.email}</p>
            <p><strong>Status:</strong> <Tag color={orderStatusColors[selectedOrder.status] || 'default'}>{selectedOrder.status.toUpperCase()}</Tag></p>
            <p><strong>Total Amount:</strong> ${selectedOrder.totalAmount.toFixed(2)}</p>
            
            <List
                dataSource={selectedOrder.items}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            title={item.product.name}
                            description={`Qty: ${item.quantity} @ $${item.priceAtSale.toFixed(2)} each`}
                        />
                        <div>${(item.quantity * item.priceAtSale).toFixed(2)}</div>
                    </List.Item>
                )}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default OrderListPage;