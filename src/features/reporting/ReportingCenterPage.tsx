import React, { useState } from 'react';
import { Card, Col, Row, Typography, List } from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  ExceptionOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';

// Import the individual report components
import ProductSalesReport from './ProductSalesReport';
import OutstandingBillsReport from './OutstandingBillsReport';
// import CustomerSalesReport from './CustomerSalesReport'; // Placeholder for when you build it
// import VoidedBillsReport from './VoidedBillsReport'; // Placeholder for when you build it

const { Title, Text } = Typography;

// Define the list of available reports
const reportList = [
    { 
        key: 'productSales', 
        title: 'Product Sales Report', 
        description: 'Sales summary by individual products.', 
        icon: <BarChartOutlined />,
        component: <ProductSalesReport />
    },
    // { 
    //     key: 'customerSales', 
    //     title: 'Customer Sales Report', 
    //     description: 'Sales summary by customers.', 
    //     icon: <TeamOutlined />,
    //     component: <CustomerSalesReport /> 
    // },
    { 
        key: 'outstandingBills', 
        title: 'Outstanding Bills Report', 
        description: 'Unsettled Layaway and Credit bills.', 
        icon: <DollarOutlined />,
        component: <OutstandingBillsReport />
    },
    // { 
    //     key: 'voidedBills', 
    //     title: 'Sales Void Report', 
    //     description: 'A log of all voided invoices.', 
    //     icon: <ExceptionOutlined />,
    //     component: <VoidedBillsReport /> 
    // },
];

const ReportingCenterPage: React.FC = () => {
    // State to track which report is currently selected
    const [activeReportKey, setActiveReportKey] = useState<string | null>(reportList[0]?.key || null);

    const activeReport = reportList.find(report => report.key === activeReportKey);

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Reporting Center</Title>
            <Row gutter={[24, 24]}>
                {/* Left Column: Report Menu */}
                <Col xs={24} md={8} lg={6}>
                    <Card title="Available Reports">
                        <List
                            itemLayout="horizontal"
                            dataSource={reportList}
                            renderItem={item => (
                                <List.Item
                                    onClick={() => setActiveReportKey(item.key)}
                                    style={{ 
                                        cursor: 'pointer', 
                                        background: activeReportKey === item.key ? '#e6f7ff' : 'transparent', 
                                        padding: '12px', 
                                        borderRadius: '8px',
                                        borderLeft: activeReportKey === item.key ? '4px solid #1677ff' : '4px solid transparent',
                                        transition: 'background 0.3s, border-left 0.3s',
                                    }}
                                    className="report-list-item"
                                >
                                    <List.Item.Meta
                                        avatar={React.cloneElement(item.icon, { style: { fontSize: '24px', color: '#1677ff' } })}
                                        title={<span style={{color: 'inherit', fontWeight: 500}}>{item.title}</span>}
                                        description={item.description}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                {/* Right Column: Active Report Display */}
                <Col xs={24} md={16} lg={18}>
                    <Card>
                        {activeReport ? (
                            activeReport.component
                        ) : (
                            <div style={{padding: '40px', textAlign: 'center'}}>
                                <Text type="secondary">Select a report from the menu on the left to view it.</Text>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ReportingCenterPage;
