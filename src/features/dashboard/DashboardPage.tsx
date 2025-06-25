import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Row, Col, Card, Statistic, Spin, Alert, Table, Tag, Typography, Empty, Button } from 'antd';
import {
  DollarCircleOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs'; // Changed from moment to dayjs for consistency with other components
import { Link, useNavigate } from 'react-router-dom';
import { GET_DASHBOARD_SUMMARY, GET_RECENT_ORDERS_FOR_DASHBOARD, GET_LOW_STOCK_ITEMS } from '../../apollo/queries/dashboardQueries';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries'; // Import GET_SETTINGS
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

// --- Interface Definitions ---
interface DashboardSummaryData {
  dashboardSummary: {
    totalSalesToday: number;
    ordersTodayCount: number;
    lowStockItemsCount: number;
  };
}

interface CustomerInfo { id: string; name?: string; }
interface UserInfo { id: string; name?: string; email: string }
interface RecentOrderData {
  id: string;
  billNumber: string; // Assuming billNumber is available for a better link
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

interface SettingsData {
  displayCurrency?: string;
  baseCurrency?: string;
}

const statusColors: { [key: string]: string } = {
  COMPLETED: 'green',
  PENDING: 'gold',
  CANCELLED: 'red',
  LAYAWAY: 'orange',
  PARTIALLY_RETURNED: 'purple',
  RETURNED: 'red',
};


const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- GraphQL Queries ---
  const { data: summaryData, loading: summaryLoading, error: summaryError } =
    useQuery<DashboardSummaryData>(GET_DASHBOARD_SUMMARY);

  const { data: recentOrdersData, loading: recentOrdersLoading, error: recentOrdersError } =
    useQuery<{ recentOrders: RecentOrderData[] }>(GET_RECENT_ORDERS_FOR_DASHBOARD, {
      variables: { limit: 5 },
    });

  const { data: lowStockData, loading: lowStockLoading, error: lowStockError } =
    useQuery<{ lowStockItems: LowStockItemData[] }>(GET_LOW_STOCK_ITEMS, {
      variables: { threshold: 10, limit: 5 },
    });

  const { data: settingsData } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  
  // --- Memoized Values ---
  const currencySymbol = useMemo(() => {
    return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
  }, [settingsData]);

  const summary = summaryData?.dashboardSummary;

  // --- Table Column Definitions ---
  const recentOrdersColumns = [
    { title: 'Order #', dataIndex: 'billNumber', key: 'billNumber', render: (text: string, record: RecentOrderData) => <Link to={`/orders/${record.id}`}>{text}</Link> },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer', render: (name?: string) => name || <Text type="secondary">Walk-in</Text> },
    { title: 'Total', dataIndex: 'totalAmount', key: 'total', align: 'right' as const, render: (amount: number) => `${currencySymbol}${amount.toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', align: 'center' as const, render: (status: string) => <Tag color={statusColors[status] || 'default'}>{status}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm') },
  ];

  const lowStockColumns = [
    { title: 'Product', dataIndex: 'name', key: 'name', render: (name: string, record: LowStockItemData) => <Link to={`/products`}>{name}</Link>},
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Stock Left', dataIndex: ['inventoryItem', 'quantity'], key: 'quantity', align: 'center' as const, render: (qty?: number) => <Tag color="red">{qty ?? 'N/A'}</Tag> },
  ];
  
  // --- Render Component ---
  return (
    <div style={{ padding: '16px 24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>
        Welcome back, {user?.name || user?.email || 'User'}!
      </Title>

      {summaryError && <Alert message="Error loading summary data" description={summaryError.message} type="error" showIcon closable style={{ marginBottom: 16 }} />}
      
      {/* Statistic Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)' }}>
            <Spin spinning={summaryLoading}>
              <Statistic
                title={<Title level={5} style={{color: '#3f8600', margin: 0}}>Total Sales Today</Title>}
                value={summary?.totalSalesToday ?? 0}
                precision={2}
                prefix={<DollarCircleOutlined />}
                valueStyle={{ color: '#3f8600', fontWeight: 500 }}
              />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #91d5ff 100%)' }}>
            <Spin spinning={summaryLoading}>
              <Statistic
                title={<Title level={5} style={{color: '#096dd9', margin: 0}}>Orders Today</Title>}
                value={summary?.ordersTodayCount ?? 0}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#096dd9', fontWeight: 500 }}
              />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffa39e 100%)' }}>
             <Spin spinning={summaryLoading}>
              <Statistic
                title={<Title level={5} style={{color: '#cf1322', margin: 0}}>Low Stock Items</Title>}
                value={summary?.lowStockItemsCount ?? 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#cf1322', fontWeight: 500 }}
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* Tables for Recent Orders and Low Stock */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card 
            title="Recent Sales" 
            bordered={false}
            extra={<Button type="link" onClick={() => navigate('/orders')}>View All <ArrowRightOutlined /></Button>}
          >
            {recentOrdersError && <Alert message="Error loading recent orders" description={recentOrdersError.message} type="error" showIcon />}
            <Table
              columns={recentOrdersColumns}
              dataSource={recentOrdersData?.recentOrders}
              loading={recentOrdersLoading}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: <Empty description="No recent sales." /> }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card 
            title="Low Stock Alert (<= 10)" 
            bordered={false}
            extra={<Button type="link" onClick={() => navigate('/products')}>Manage Products <ArrowRightOutlined /></Button>}
          >
            {lowStockError && <Alert message="Error loading low stock items" description={lowStockError.message} type="error" showIcon />}
            <Table
              columns={lowStockColumns}
              dataSource={lowStockData?.lowStockItems}
              loading={lowStockLoading}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: <Empty description="No items with low stock." /> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
