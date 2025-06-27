import React, { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  Row,
  Col,
  Card,
  Statistic,
  Spin,
  Alert,
  DatePicker,
  Button,
  Typography,
  Divider,
  Table,
  Tabs,
  Space,
} from 'antd';
import {
  FilterOutlined,
  DollarCircleOutlined,
  RiseOutlined,
  FallOutlined,
  ShoppingCartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import dayjs from 'dayjs';
import { GET_ANALYTICS_SUMMARY, GET_ANALYTICS_TIME_SERIES } from '../../apollo/queries/reportingQueries';
import { useSettings } from '../../contexts/SettingsContext';
import { formatCurrency } from '../../common/utils/formatting';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

type AnalyticsMetricKey = 'revenueExTax' | 'totalCost' | 'grossProfit' | 'totalDiscounts' | 'totalTax' | 'salesCount' | 'netProfit';

const AnalyticsPage: React.FC = () => {
  const { messageApi } = useAntdNotice();
  const { settings } = useSettings();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs()]);

  const [chartMetric, setChartMetric] = useState<AnalyticsMetricKey>('revenueExTax');
  const [chartData, setChartData] = useState([]);
  const [chartTitle, setChartTitle] = useState('Revenue Trend');

  const [fetchSummary, { data: summaryData, loading: summaryLoading, error }] = useLazyQuery(GET_ANALYTICS_SUMMARY);
  const [fetchChartData, { loading: chartLoading }] = useLazyQuery(GET_ANALYTICS_TIME_SERIES, {
    onCompleted: (data) => setChartData(data.analyticsTimeSeries),
    onError: (err) => messageApi.error(`Failed to load chart data: ${err.message}`),
  });

  const handleGenerate = () => {
    if (!dateRange?.[0] || !dateRange?.[1]) return;
    const variables = {
        filters: {
            startDate: dateRange[0].startOf('day').toISOString(),
            endDate: dateRange[1].endOf('day').toISOString(),
        }
    };
    fetchSummary({ variables });
    fetchChartData({ variables: { ...variables, metric: chartMetric } });
  };

  const handleCardClick = (metric: AnalyticsMetricKey, title: string) => {
    if (!dateRange?.[0] || !dateRange?.[1]) return;
    setChartMetric(metric);
    setChartTitle(title);
    fetchChartData({
      variables: {
        metric,
        filters: {
          startDate: dateRange[0].startOf('day').toISOString(),
          endDate: dateRange[1].endOf('day').toISOString(),
        },
      },
    });
  };

  useEffect(handleGenerate, []);

  const summary = summaryData?.analyticsSummary;
  const currency = settings.displayCurrency || settings.baseCurrency || 'USD';

  const chartConfig = {
    data: chartData,
    padding: 'auto',
    xField: 'date',
    yField: 'value',
    height: 300,
    smooth: true,
  };

  const breakdownColumns = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Gross Sales', dataIndex: 'grossSales', key: 'grossSales', render: (val: number) => formatCurrency(val, currency), align: 'right' as const },
      { title: 'Cost', dataIndex: 'totalCost', key: 'cost', render: (val: number) => formatCurrency(val, currency), align: 'right' as const },
      { title: 'Profit', dataIndex: 'totalProfit', key: 'profit', render: (val: number) => <Text type={val >= 0 ? 'success' : 'danger'} strong>{formatCurrency(val, currency)}</Text>, align: 'right' as const },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Analytics Dashboard</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as any)} />
          <Button type="primary" icon={<FilterOutlined />} onClick={handleGenerate} loading={summaryLoading}>Generate</Button>
        </Space>
      </Card>

      {summaryLoading && <div style={{textAlign: 'center', padding: 50}}><Spin size="large" /></div>}
      {error && !summaryLoading && <Alert message="Error" description={error.message} type="error" showIcon />}

      {summary && !summaryLoading && (
        <Space direction="vertical" size="large" style={{width: '100%'}}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}><Card hoverable onClick={() => handleCardClick('revenueExTax', 'Revenue Trend')}><Statistic title="Revenue (Ex. Tax)" value={formatCurrency(summary.revenueExTax, currency)} prefix={<RiseOutlined />} valueStyle={{color: '#3f8600'}}/></Card></Col>
            <Col xs={24} sm={12} md={8} lg={6}><Card hoverable onClick={() => handleCardClick('totalCost', 'Cost Trend')}><Statistic title="Cost of Goods" value={formatCurrency(summary.totalCost, currency)} prefix={<FallOutlined />} /></Card></Col>
            <Col xs={24} sm={12} md={8} lg={6}><Card hoverable onClick={() => handleCardClick('grossProfit', 'Gross Profit Trend')}><Statistic title="Gross Profit" value={formatCurrency(summary.grossProfit, currency)} valueStyle={summary.grossProfit >= 0 ? {color: '#3f8600'} : {color: '#cf1322'}}/></Card></Col>
            <Col xs={24} sm={12} md={8} lg={6}><Card hoverable onClick={() => handleCardClick('netProfit', 'Net Profit Trend')}><Statistic title="Net Profit" value={formatCurrency(summary.netProfit, currency)} valueStyle={summary.netProfit >= 0 ? {color: '#3f8600'} : {color: '#cf1322'}}/></Card></Col>
            <Col xs={24} sm={12} md={8} lg={6}><Card hoverable onClick={() => handleCardClick('salesCount', 'Sales Count Trend')}><Statistic title="Sales Count" value={summary.salesCount} prefix={<ShoppingCartOutlined />} /></Card></Col>
            <Col xs={24} sm={12} md={8} lg={6}><Card><Statistic title="Total Discounts" value={formatCurrency(summary.totalDiscounts, currency)} valueStyle={{color: '#cf1322'}}/></Card></Col>
            <Col xs={24} sm={12} md={8} lg={6}><Card><Statistic title="Total Tax" value={formatCurrency(summary.totalTax, currency)} /></Card></Col>
            <Col xs={24} sm={12} md={8} lg={6}><Card><Statistic title="Total Expenses" value={formatCurrency(summary.totalExpenses, currency)} /></Card></Col>
          </Row>

          <Card title={chartTitle} style={{ marginBottom: 24 }}>
            {chartLoading ? <div style={{textAlign: 'center', padding: '50px'}}><Spin /></div> : <Line {...chartConfig} />}
          </Card>

          <Card>
            <Tabs defaultActiveKey="1">
              <TabPane tab="Breakdown by Category" key="1"><Table columns={breakdownColumns} dataSource={summary.byCategory} rowKey="id" pagination={{pageSize: 10}} /></TabPane>
              <TabPane tab="Breakdown by Supplier" key="2"><Table columns={breakdownColumns} dataSource={summary.bySupplier} rowKey="id" pagination={{pageSize: 10}} /></TabPane>
            </Tabs>
          </Card>
        </Space>
      )}
    </div>
  );
};

export default AnalyticsPage;