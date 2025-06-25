import React, { useState, useEffect, useMemo } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { Row, Col, Card, Statistic, Spin, Alert, DatePicker, Button, Typography, Table, message } from 'antd';
import {
  DollarCircleOutlined, ShoppingCartOutlined, CalculatorOutlined, SearchOutlined,
  LineChartOutlined, PieChartOutlined, TrophyOutlined
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts'; // Import charts
import dayjs, { Dayjs } from 'dayjs';
import {
  GET_SALES_SUMMARY_BY_DATE_RANGE,
  GET_DAILY_SALES,
  GET_SALES_BREAKDOWN_BY_CATEGORY,
  GET_TOP_SELLING_PRODUCTS,
} from '../../apollo/queries/reportingQueries';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// --- Interfaces for fetched data ---
interface SalesSummaryData {
  salesSummaryByDateRange: {
    totalSales: number;
    numberOfOrders: number;
    averageOrderValue: number;
  };
}
interface DailySalesData {
  dailySales: { date: string; value: number; }[];
}
interface CategoryBreakdownData {
  salesBreakdownByCategory: { categoryName: string; totalSales: number; }[];
}
interface TopProductData {
  topSellingProducts: {
    product: { id: string; name: string; sku: string; };
    totalQuantitySold: number;
    totalRevenue: number;
  }[];
}

interface SettingsInfo {
  displayCurrency?: string;
  baseCurrency?: string;
}

const ReportingPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('day'),
  ]);

  const [fetchSummary, { data: summaryData, loading: summaryLoading }] = useLazyQuery<SalesSummaryData>(GET_SALES_SUMMARY_BY_DATE_RANGE);
  const [fetchDailySales, { data: dailySalesData, loading: dailySalesLoading }] = useLazyQuery<DailySalesData>(GET_DAILY_SALES);
  const [fetchCategoryBreakdown, { data: categoryData, loading: categoryLoading }] = useLazyQuery<CategoryBreakdownData>(GET_SALES_BREAKDOWN_BY_CATEGORY);
  const [fetchTopProducts, { data: topProductsData, loading: topProductsLoading }] = useLazyQuery<TopProductData>(GET_TOP_SELLING_PRODUCTS);
  const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);
  
  const currencySymbol = useMemo(() => {
            return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
          }, [settingsData]);
  const isLoading = summaryLoading || dailySalesLoading || categoryLoading || topProductsLoading;

  const fetchAllReports = () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.error("Please select a valid date range.");
      return;
    }

    const variables = {
      startDate: dateRange[0].startOf('day').toISOString(),
      endDate: dateRange[1].endOf('day').toISOString(),
    };

    fetchSummary({ variables });
    fetchDailySales({ variables });
    fetchCategoryBreakdown({ variables });
    fetchTopProducts({ variables: { ...variables, take: 5 } });
  };

  useEffect(() => {
    fetchAllReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasRole([Role.ADMIN, Role.MANAGER])) {
    return <Alert message="Access Denied" description="You do not have permission to view reports." type="error" showIcon />;
  }

  const dailySalesConfig = {
    data: dailySalesData?.dailySales || [],
    padding: 'auto',
    xField: 'date',
    yField: 'value',
    xAxis: { tickCount: 5 },
    yAxis: {
      label: { formatter: (v: string) => `${currencySymbol}${v}` }
    },
    tooltip: {
      formatter: (datum: any) => ({ name: 'Sales', value: `${currencySymbol}${datum.value.toFixed(2)}` })
    },
    smooth: true,
  };

  const categoryBreakdownConfig = {
    appendPadding: 10,
    data: categoryData?.salesBreakdownByCategory || [],
    angleField: 'totalSales',
    colorField: 'categoryName',
    radius: 0.8,
    label: {
      type: 'inner',
      offset: '-50%',
      content: '{value}',
      style: { textAlign: 'center', fontSize: 14, fill: '#fff' },
      formatter: (datum: any) => `${currencySymbol}${datum.totalSales.toFixed(0)}`,
    },
    interactions: [{ type: 'element-active' }],
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.categoryName,
        value: `${currencySymbol}${datum.totalSales.toFixed(2)}`
      })
    },
  };

  const topProductsColumns = [
    { title: 'Product Name', dataIndex: ['product', 'name'], key: 'name' },
    { title: 'SKU', dataIndex: ['product', 'sku'], key: 'sku' },
    { title: 'Total Units Sold', dataIndex: 'totalQuantitySold', key: 'units', align: 'right' as const },
    { title: 'Total Revenue', dataIndex: 'totalRevenue', key: 'revenue', align: 'right' as const, render: (val: number) => `${currencySymbol}${val.toFixed(2)}` },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>Business Reports 📊</Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="bottom">
          <Col xs={24} sm={24} md={18}>
            <Text strong>Select Date Range:</Text><br />
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs])}
              style={{ width: '100%' }}
              ranges={{
                'Today': [dayjs().startOf('day'), dayjs().endOf('day')],
                'This Week': [dayjs().startOf('week'), dayjs().endOf('week')],
                'This Month': [dayjs().startOf('month'), dayjs().endOf('month')],
                'Last Month': [
                  dayjs().subtract(1, 'month').startOf('month'),
                  dayjs().subtract(1, 'month').endOf('month')
                ],
                'This Year': [dayjs().startOf('year'), dayjs().endOf('year')],
              }}
            />
          </Col>
          <Col xs={24} sm={24} md={6}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={fetchAllReports}
              loading={isLoading}
              style={{ width: '100%', marginTop: '10px' }}
            >
              Generate Report
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card bordered hoverable>
            <Statistic title="Total Sales" value={summaryData?.salesSummaryByDateRange.totalSales} precision={2} prefix={<DollarCircleOutlined />} valueStyle={{ color: '#3f8600' }} loading={summaryLoading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered hoverable>
            <Statistic title="Number of Orders" value={summaryData?.salesSummaryByDateRange.numberOfOrders} prefix={<ShoppingCartOutlined />} valueStyle={{ color: '#1890ff' }} loading={summaryLoading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered hoverable>
            <Statistic title="Average Order Value" value={summaryData?.salesSummaryByDateRange.averageOrderValue} precision={2} prefix={<CalculatorOutlined />} valueStyle={{ color: '#faad14' }} loading={summaryLoading} />
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title={<><LineChartOutlined /> Sales Trend</>} style={{ height: '100%' }}>
            {dailySalesLoading ? <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div> : <Line {...dailySalesConfig} />}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<><PieChartOutlined /> Sales by Category</>} style={{ height: '100%' }}>
            {categoryLoading ? <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div> : <Pie {...categoryBreakdownConfig} />}
          </Card>
        </Col>

        <Col xs={24}>
          <Card title={<><TrophyOutlined /> Top 5 Selling Products</>}>
            <Table
              columns={topProductsColumns}
              dataSource={topProductsData?.topSellingProducts}
              loading={topProductsLoading}
              rowKey={(record) => record.product.id}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReportingPage;
