import React, { useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  Spin,
  Alert,
  Descriptions,
  Card,
  Table,
  Tag,
  Typography,
  Button,
  Row,
  Col,
  Divider,
  Space,
  Empty,
} from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';

import { GET_ORDER_DETAILS_BY_ID } from '../../apollo/queries/orderQueries';
// import { GQLOrderStatus } from '../../common/enums/order-status.enum';
import Receipt, { type OrderDataForReceipt } from '../pos/Receipt';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { Title, Text, Paragraph } = Typography;

const OrderDetailPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { messageApi } = useAntdNotice();

  const { data, loading, error } = useQuery<{ order: OrderDataForReceipt }>(
    GET_ORDER_DETAILS_BY_ID,
    {
      variables: { id: orderId },
      fetchPolicy: 'cache-and-network',
      onError: (err) => {
        messageApi.error(`Error loading order: ${err.message}`);
      }
    }
  );

  const receiptRef = useRef<HTMLDivElement>(null);
      const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${data?.order?.billNumber || 'order'}`,
        onAfterPrint: () => receiptRef.current?.focus(),
      });
  
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" tip="Loading Order Details..."/></div>;
  }
  
  // Use a more user-friendly error display that doesn't halt rendering
  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error"
          description="Could not load the requested order. It may not exist or you may not have permission to view it."
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/orders')}>
              Back to Orders List
            </Button>
          }
        />
      </div>
    );
  }
  
  const order = data?.order;
  
  // If query succeeds but returns no data
  if (!order) {
    return (
        <div style={{ padding: '24px' }}>
            <Empty description="No order found with the specified ID." />
            <div style={{textAlign: 'center', marginTop: '16px'}}>
                 <Button type="primary" onClick={() => navigate('/orders')}>
                    Back to Orders List
                </Button>
            </div>
        </div>
    );
  }


  const statusColors: Record<string, string> = { 
    COMPLETED: 'green', RETURNED: 'red', PARTIALLY_RETURNED: 'orange', CANCELLED: 'gray' 
  };

  const itemColumns = [
    { title: 'Product', dataIndex: ['product', 'name'], key: 'productName' },
    { title: 'Qty', dataIndex: 'quantity', key: 'qty', align: 'center' as const },
    { title: 'Price at Sale', dataIndex: 'priceAtSale', key: 'price', align: 'right' as const, render: (val: number) => `$${val.toFixed(2)}` },
    { title: 'Discount', dataIndex: 'discountAmount', key: 'discount', align: 'right' as const, render: (val: number) => `-$${val.toFixed(2)}` },
    { title: 'Final Price', key: 'final', align: 'right' as const, render: (_: any, record: any) => `$${(record.lineTotal - record.discountAmount).toFixed(2)}` },
    { title: 'Line Total', dataIndex: 'finalLineTotal', key: 'lineTotal', align: 'right' as const, render: (val: number) => <Text strong>${val.toFixed(2)}</Text> },
  ];
  
  const paymentColumns = [
      { title: 'Method', dataIndex: 'method', key: 'method', render: (val: string) => val.replace('_', ' ') },
      { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (val: number) => `$${val.toFixed(2)}` }
  ];

  return (
    <>
      <div style={{ padding: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* --- Header and Action Buttons --- */}
          <Row justify="space-between" align="middle" wrap={false}>
            <Col>
              <Space>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>Back to List</Button>
                  <Title level={2} style={{ margin: 0 }}>Order: {order.billNumber}</Title>
                  {/* <Tag color={statusColors[order.status] || 'default'}>{order.status.replace('_', ' ')}</Tag> */}
              </Space>
            </Col>
            <Col>
              <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
                Print Receipt
              </Button>
            </Col>
          </Row>

          {/* --- Order and Customer Details --- */}
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Card title="Order Details">
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Bill Number">{order.billNumber}</Descriptions.Item>
                  <Descriptions.Item label="Date & Time">{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                  <Descriptions.Item label="Cashier">{order.user?.name || order.user?.email}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Customer Information">
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Customer Name">{order.customer?.name || 'Walk-in Customer'}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
          
          {/* --- Items and Financial Summary --- */}
          <Card title="Order Items & Financials">
            <Table columns={itemColumns} dataSource={order.items} rowKey="id" pagination={false} bordered size="middle" />
            <Row justify="end" style={{marginTop: 24}}>
                <Col xs={24} sm={12} md={8}>
                    <Card size="small" title="Financial Summary" variant="outlined">
                        <Descriptions column={1} layout="horizontal" size="small">
                            <Descriptions.Item label="Subtotal">${order.itemsTotal.toFixed(2)}</Descriptions.Item>
                            <Descriptions.Item label="Discount">-${order.discountAmount.toFixed(2)}</Descriptions.Item>
                            <Descriptions.Item label="Tax">${order.taxAmount.toFixed(2)}</Descriptions.Item>
                            <Descriptions.Item label={<Text strong>Grand Total</Text>}><Text strong>${order.grandTotal.toFixed(2)}</Text></Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
            </Row>
          </Card>
          
          {/* --- Payments --- */}
          <Card title="Payments Received">
              <Table columns={paymentColumns} dataSource={order.payments} rowKey="id" pagination={false} size="small" bordered />
              <Row justify="end" style={{marginTop: 16}}>
                <Col>
                    <Space direction="vertical" align="end" size="small">
                        <Text strong>Total Paid: ${order.amountPaid.toFixed(2)}</Text>
                        <Text strong>Change Given: ${order.changeGiven.toFixed(2)}</Text>
                    </Space>
                </Col>
              </Row>
          </Card>
          
        </Space>
      </div>

      {/* --- Hidden Component for Printing --- */}
      <div className="receipt-container-hidden">
        <div ref={receiptRef}>
          <Receipt order={order} />
        </div>
      </div>
    </>
  );
};

export default OrderDetailPage;