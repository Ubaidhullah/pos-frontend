import React from 'react';
import { useQuery } from '@apollo/client';
import { Row, Col, Card, Statistic, Spin, Alert, Table, Tag, Typography, List, Empty } from 'antd';
import {
  DollarCircleOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
  UserOutlined, // For current user display
  TeamOutlined, // For customer
} from '@ant-design/icons';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { GET_DASHBOARD_SUMMARY, GET_RECENT_ORDERS_FOR_DASHBOARD, GET_LOW_STOCK_ITEMS } from '../../apollo/queries/dashboardQueries';
import { useAuth } from '../../contexts/AuthContext'; // To greet the user

const { Title, Text } = Typography;

// Define types for the data you expect from GraphQL
interface DashboardSummaryData {
  dashboardSummary: {
    totalSalesToday: number;
    ordersTodayCount: number;
    lowStockItemsCount: number;
  };
}

interface CustomerInfo { id: string; name?: string; }
interface UserInfo { id: string; name?: string; }
interface RecentOrderData {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  customer?: CustomerInfo;
  user: UserInfo;
}

interface LowStockItemData {
  id: string;
  name: string;
  sku: string;
  inventoryItem?: {
    quantity: number;
  };
}


const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: summaryData, loading: summaryLoading, error: summaryError } =
    useQuery<DashboardSummaryData>(GET_DASHBOARD_SUMMARY);

  const { data: recentOrdersData, loading: recentOrdersLoading, error: recentOrdersError } =
    useQuery<{ recentOrders: RecentOrderData[] }>(GET_RECENT_ORDERS_FOR_DASHBOARD, {
      variables: { limit: 5 }, // Fetch top 5 recent orders
    });

  const { data: lowStockData, loading: lowStockLoading, error: lowStockError } =
    useQuery<{ lowStockItems: LowStockItemData[] }>(GET_LOW_STOCK_ITEMS, {
      variables: { threshold: 10, limit: 5 }, // Items with stock <= 10
    });

  const summary = summaryData?.dashboardSummary;

  const recentOrdersColumns = [
    { title: 'Order ID', dataIndex: 'id', key: 'id', render: (id: string) => <Link to={`/orders/${id}`}>{id.substring(0, 8)}...</Link> },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer', render: (name?: string) => name || <Text type="secondary">N/A</Text> },
    { title: 'Total', dataIndex: 'totalAmount', key: 'total', render: (amount: number) => `$${amount.toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'COMPLETED' ? 'green' : (status === 'PENDING' ? 'gold' : 'red')}>{status}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => moment(date).format('YYYY-MM-DD HH:mm') },
  ];

  const lowStockColumns = [
    { title: 'Product', dataIndex: 'name', key: 'name', render: (name: string, record: LowStockItemData) => <Link to={`/admin/products/edit/${record.id}`}>{name}</Link>}, // Assuming you have an edit route or similar
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Stock', dataIndex: ['inventoryItem', 'quantity'], key: 'quantity', render: (qty?: number) => <Tag color="red">{qty ?? 'N/A'}</Tag> },
  ];


  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        Welcome back, {user?.name || user?.email || 'User'}!
      </Title>

      {summaryError && <Alert message="Error loading summary data" description={summaryError.message} type="error" showIcon closable style={{ marginBottom: 16 }} />}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false} hoverable>
            {summaryLoading ? <Spin /> : (
              <Statistic
                title="Total Sales Today"
                value={summary?.totalSalesToday ?? 0}
                precision={2}
                prefix={<DollarCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false} hoverable>
            {summaryLoading ? <Spin /> : (
              <Statistic
                title="Orders Today"
                value={summary?.ordersTodayCount ?? 0}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false} hoverable>
            {summaryLoading ? <Spin /> : (
              <Statistic
                title="Low Stock Items"
                value={summary?.lowStockItemsCount ?? 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            )}
          </Card>
        </Col>
        {/* Add more Statistic Cards here if needed */}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Recent Orders" bordered={false}>
            {recentOrdersError && <Alert message="Error loading recent orders" description={recentOrdersError.message} type="error" showIcon />}
            <Table
              columns={recentOrdersColumns}
              dataSource={recentOrdersData?.recentOrders}
              loading={recentOrdersLoading}
              rowKey="id"
              pagination={false} // Or simple pagination { pageSize: 5 }
              size="small"
            />
            {(!recentOrdersLoading && (!recentOrdersData || recentOrdersData.recentOrders.length === 0)) && <Empty description="No recent orders found." />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Low Stock Items (<= 10)" bordered={false}>
            {lowStockError && <Alert message="Error loading low stock items" description={lowStockError.message} type="error" showIcon />}
            <Table
              columns={lowStockColumns}
              dataSource={lowStockData?.lowStockItems}
              loading={lowStockLoading}
              rowKey="id"
              pagination={false} // Or simple pagination { pageSize: 5 }
              size="small"
            />
             {(!lowStockLoading && (!lowStockData || lowStockData.lowStockItems.length === 0)) && <Empty description="No low stock items found." />}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
