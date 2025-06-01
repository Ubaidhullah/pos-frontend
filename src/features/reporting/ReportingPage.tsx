import React, { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client'; // Use useLazyQuery for on-demand fetching
import { Row, Col, Card, Statistic, Spin, Alert, DatePicker, Button, Typography, Divider, message } from 'antd';
import { DollarCircleOutlined, ShoppingCartOutlined, CalculatorOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import { GET_SALES_SUMMARY_BY_DATE_RANGE } from '../../apollo/queries/reportingQueries';
import { useAuth } from '../../contexts/AuthContext'; // For role-based access if needed
import { Role } from '../../common/enums/role.enum';


const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Text } = Typography;

dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(isoWeek);
// Define the structure of the data expected from the GraphQL query
interface SalesSummaryData {
  salesSummaryByDateRange: {
    totalSales: number;
    numberOfOrders: number;
    averageOrderValue: number;
  };
}

const ReportingPage: React.FC = () => {
  const { hasRole } = useAuth(); // Example: restrict access if needed, though route protection is primary

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  

  const [
    fetchSalesSummary,
    { data: summaryData, loading: summaryLoading, error: summaryError, called }
  ] = useLazyQuery<SalesSummaryData>(GET_SALES_SUMMARY_BY_DATE_RANGE);

  const handleFetchReport = () => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      fetchSalesSummary({
        variables: {
          startDate: dateRange[0].toISOString(), // Send as ISO string
          endDate: dateRange[1].toISOString(),   // Send as ISO string
        },
      });
    } else {
      message.error('Please select a valid date range.');
    }
  };

  // Fetch report on initial load with default date range
  useEffect(() => {
    handleFetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const summary = summaryData?.salesSummaryByDateRange;

  // Ensure user has permission (though primary control is via route guards)
  if (!hasRole([Role.ADMIN, Role.MANAGER])) {
      return <Alert message="Access Denied" description="You do not have permission to view this page." type="error" showIcon />;
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>Sales Summary Report</Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="bottom">
          <Col xs={24} sm={12} md={10}>
            <Text strong>Select Date Range:</Text><br/>
            <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                style={{ width: '100%' }}
                ranges={{
                    Today: [dayjs().startOf('day'), dayjs().endOf('day')],
                    Yesterday: [
                    dayjs().subtract(1, 'day').startOf('day'),
                    dayjs().subtract(1, 'day').endOf('day'),
                    ],
                    'This Week': [dayjs().startOf('week'), dayjs().endOf('week')],
                    'Last Week': [
                    dayjs().subtract(1, 'week').startOf('week'),
                    dayjs().subtract(1, 'week').endOf('week'),
                    ],
                    'This Month': [dayjs().startOf('month'), dayjs().endOf('month')],
                    'Last Month': [
                    dayjs().subtract(1, 'month').startOf('month'),
                    dayjs().subtract(1, 'month').endOf('month'),
                    ],
                }}
                />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleFetchReport}
              loading={summaryLoading}
              style={{ width: '100%', marginTop: '10px' }} // Adjust margin for mobile
            >
              Generate Report
            </Button>
          </Col>
        </Row>
      </Card>

      {summaryLoading && <div style={{textAlign: 'center', padding: '50px'}}><Spin size="large" tip="Loading report..." /></div>}
      {summaryError && !summaryLoading && (
        <Alert
          message="Error loading sales summary"
          description={summaryError.message}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {called && !summaryLoading && !summaryError && summary && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card bordered hoverable>
              <Statistic
                title="Total Sales"
                value={summary.totalSales}
                precision={2}
                prefix={<DollarCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card bordered hoverable>
              <Statistic
                title="Number of Orders"
                value={summary.numberOfOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card bordered hoverable>
              <Statistic
                title="Average Order Value"
                value={summary.averageOrderValue}
                precision={2}
                prefix={<CalculatorOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      )}
      {called && !summaryLoading && !summaryError && !summary && (
          <Alert message="No data found for the selected period." type="info" showIcon />
      )}

      {/* Placeholder for potential charts or more detailed tables */}
      {/* <Divider style={{marginTop: 32}}>Sales Trend (Chart Placeholder)</Divider> */}
      {/* <Card title="Sales Trend"> ... Chart component would go here ... </Card> */}
    </div>
  );
};

export default ReportingPage;