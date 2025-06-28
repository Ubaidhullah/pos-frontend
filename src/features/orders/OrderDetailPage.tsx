import React, { useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
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
  Space,
  Empty,
  Modal,
  List,
  Grid,
} from 'antd';
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  PrinterOutlined,
  TruckOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';

import { GET_ORDER_DETAILS_BY_ID } from '../../apollo/queries/orderQueries';
import { CREATE_DELIVERY_FROM_ORDER } from '../../apollo/mutations/deliveryMutations';
import { VOID_ORDER } from '../../apollo/mutations/orderMutations';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import { useAuth } from '../../contexts/AuthContext';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { Role } from '../../common/enums/role.enum';
import Receipt, { type OrderDataForReceipt as ReceiptData } from '../pos/Receipt';
import ScheduleDeliveryModal from '../deliveries/ScheduleDeliveryModal'; 

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface SettingsData {
  displayCurrency?: string;
  baseCurrency?: string;
}

interface OrderDataForReceipt extends ReceiptData {
  id: string;
  billNumber: string;
  deliveryAddress?: string;
  delivery: {
    id: string;
    deliveryNumber: string;
    status: string;
  } | null;
}

const OrderDetailPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { messageApi } = useAntdNotice();
  const screens = useBreakpoint();

  const [isVoidModalVisible, setIsVoidModalVisible] = useState(false);
   const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const { data: settingsData } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  const { data, loading, error, refetch } = useQuery<{ order: OrderDataForReceipt }>(
    GET_ORDER_DETAILS_BY_ID,
    {
      variables: { id: orderId },
      fetchPolicy: 'cache-and-network',
      onError: (err) => messageApi.error(`Error loading order: ${err.message}`),
    }
  );

  const [createDelivery, { loading: deliveryLoading }] = useMutation(CREATE_DELIVERY_FROM_ORDER, {
    onCompleted: (data) => {
      messageApi.success(`Delivery #${data.createDeliveryFromOrder.deliveryNumber} has been scheduled!`);
      refetch();
    },
    onError: (err) => {
      messageApi.error(`Failed to schedule delivery: ${err.message}`);
    },
  });

  const [voidOrder, { loading: voidLoading }] = useMutation(VOID_ORDER, {
    onCompleted: () => {
      messageApi.success('Order has been successfully voided.');
      refetch();
    },
    onError: (err) => {
      messageApi.error(`Failed to void order: ${err.message}`);
    },
  });

 const receiptRef = useRef<HTMLDivElement>(null);
      const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${data?.order?.billNumber || 'order'}`,
        onAfterPrint: () => receiptRef.current?.focus(),
      });
  const currencySymbol = useMemo(() => {
    return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
  }, [settingsData]);

  if (loading)
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Loading Order Details..." />
      </div>
    );
  if (error)
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error"
          description="Could not load the requested order."
          type="error"
          showIcon
          action={<Button type="primary" onClick={() => navigate('/orders')}>Back to Orders</Button>}
        />
      </div>
    );

  const order = data?.order;
  if (!order)
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="No order found." />
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Button type="primary" onClick={() => navigate('/orders')}>
            Back to Orders
          </Button>
        </div>
      </div>
    );

  const canBeScheduled = hasRole([Role.ADMIN, Role.MANAGER]) && order.deliveryAddress && !order.delivery;
  const canBeVoided = hasRole([Role.ADMIN, Role.MANAGER]) && order.status === OrderStatus.COMPLETED;

  const itemColumns = [
    { title: 'Product', dataIndex: ['product', 'name'], key: 'productName' },
    { title: 'Qty', dataIndex: 'quantity', key: 'qty', align: 'center' as const },
    { title: 'Price at Sale', dataIndex: 'priceAtSale', key: 'price', align: 'right' as const, render: (val: number) => `${currencySymbol}${val.toFixed(2)}` },
    { title: 'Line Total', dataIndex: 'lineTotal', key: 'lineTotal', align: 'right' as const, render: (val: number) => <Text strong>{currencySymbol}{val.toFixed(2)}</Text> },
  ];

  const paymentColumns = [
    { title: 'Method', dataIndex: 'method', key: 'method', render: (val: string) => val.replace('_', ' ') },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (val: number) => `${currencySymbol}${val.toFixed(2)}` }
  ];

  return (
    <>
      <div style={{ padding: screens.md ? '24px' : '12px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
              <Space align="center" wrap>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
                  Back to List
                </Button>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Order: {order.billNumber}
                  </Title>
                  <Tag color="blue">{order.delivery?.status || 'Not scheduled'}</Tag>
                </div>
              </Space>
            </Col>
            <Col>
              <Space wrap>
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                  Print Receipt
                </Button>
                {canBeScheduled && (
                    <Button 
                        type="primary" 
                        icon={<TruckOutlined />} 
                        onClick={() => setIsScheduleModalOpen(true)}
                    >
                        Schedule for Delivery
                    </Button>
                )}
                {canBeVoided && (
                  <Button
                    danger
                    type="primary"
                    icon={<StopOutlined />}
                    onClick={() => setIsVoidModalVisible(true)}
                    loading={voidLoading}
                  >
                    Void Sale
                  </Button>
                )}
              </Space>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title="Order & Delivery Details" size="small">
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Date & Time">
                    {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Cashier">
                    {order.user?.name || order.user?.email}
                  </Descriptions.Item>
                  <Descriptions.Item label="Delivery Status">
                    {order.delivery ? (
                      <Tag color="blue">{order.delivery.status}</Tag>
                    ) : (
                      <Text type="secondary">Not scheduled for delivery</Text>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Customer & Delivery Address" size="small">
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Name">
                    {order.customer?.name || 'Walk-in Customer'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Delivery Address">
                    <Paragraph style={{ margin: 0 }} ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}>
                      {order.deliveryAddress || (
                        <Text type="secondary">No delivery address provided.</Text>
                      )}
                    </Paragraph>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>

          <Card title="Items & Financials">
            <Table columns={itemColumns} dataSource={order.items} rowKey="id" pagination={false} bordered size="middle" />
            <Row justify="end" style={{ marginTop: 24 }}>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" title="Financial Summary">
                  <Descriptions column={1} layout="horizontal" size="small">
                    <Descriptions.Item label="Subtotal">{currencySymbol}{order.subTotal.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="Discount">-{currencySymbol}{order.discountAmount.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="Tax">{currencySymbol}{order.taxAmount.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label={<Text strong>Grand Total</Text>}>
                      <Text strong>{currencySymbol}{order.grandTotal.toFixed(2)}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </Card>

          <Card title="Payments Received">
            <Table columns={paymentColumns} dataSource={order.payments} rowKey="id" pagination={false} size="small" bordered scroll={{ x: 'max-content' }} />
            <Row justify="end" style={{ marginTop: 16 }}>
              <Col>
                <Space direction="vertical" align="end" size="small">
                  <Text strong>Total Paid: {currencySymbol}{order.amountPaid.toFixed(2)}</Text>
                  <Text strong>Change Given: {currencySymbol}{order.changeGiven.toFixed(2)}</Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Space>
      </div>

      <Modal
        title="Confirm Void Sale"
        open={isVoidModalVisible}
        onOk={() => {
          voidOrder({ variables: { orderId } });
          setIsVoidModalVisible(false);
        }}
        onCancel={() => setIsVoidModalVisible(false)}
        okText="Yes, Void Sale"
        okButtonProps={{ danger: true, loading: voidLoading }}
      >
        <ExclamationCircleOutlined style={{ fontSize: 20, color: '#faad14', marginRight: 8 }} />
        This action is irreversible. All items will be returned to stock.
      </Modal>

      <ScheduleDeliveryModal
        open={isScheduleModalOpen}
        onClose={() => {
            setIsScheduleModalOpen(false);
            refetch(); // Refetch order data when modal closes
        }}
        orderId={order.id}
      />

      <div className="receipt-container-hidden">
        <div ref={receiptRef}>
          <Receipt order={order} />
        </div>
      </div>
    </>
  );
};

export default OrderDetailPage;
