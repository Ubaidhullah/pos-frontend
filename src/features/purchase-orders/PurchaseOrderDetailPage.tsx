import React, { useMemo, useState } from 'react';
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
  message,
  Empty,
  Grid, // Import Grid for breakpoint detection
  List,   // Import List for mobile view
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeliveredProcedureOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { GET_PURCHASE_ORDER_BY_ID } from '../../apollo/queries/purchaseOrderQueries';
import { PurchaseOrderStatus } from '../../common/enums/purchase-order-status.enum';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import UpdatePOStatusModal from './UpdatePOStatusModal';
import ReceivePOItemsModal from './ReceivePOItemsModal';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';


const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid; // Hook to get screen size info

// --- Interfaces for data structures (omitted for brevity, same as your file) ---
interface LandedCost { name: string; amount: number; }
interface SupplierDetail { id: string; name: string; email?: string; phone?: string; address?: string;}
interface UserDetail { id: string; name?: string; email: string; }
interface PurchaseOrderFullDetail { updatedAt: string | number | Date | null | undefined; createdAt: string | number | Date | null | undefined; id: string; poNumber: string; orderDate: string; expectedDeliveryDate?: string; actualDeliveryDate?: string; status: PurchaseOrderStatus; totalAmount: number; notes?: string; taxes?: number; landingCosts?: LandedCost[] | string; supplier: SupplierDetail; user?: UserDetail; items: { id: string; product: { id: string; name: string; sku?: string; }; quantityOrdered: number; quantityReceived: number; unitCost: number; totalCost: number; }[]; }
interface SettingsInfo { displayCurrency?: string; baseCurrency?: string; }

const PurchaseOrderDetailPage: React.FC = () => {
  const { id: poId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const screens = useBreakpoint(); // Get screen size information

  const { data, loading, error, refetch } = useQuery<{ purchaseOrder: PurchaseOrderFullDetail }>(
    GET_PURCHASE_ORDER_BY_ID,
    {
      variables: { id: poId },
      fetchPolicy: 'cache-and-network',
    }
  );

  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [isReceiveItemsModalOpen, setIsReceiveItemsModalOpen] = useState(false);
  const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);
  
  const currencySymbol = useMemo(() => {
            return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
          }, [settingsData]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  if (error) return <Alert message="Error Loading Purchase Order" description={error.message} type="error" showIcon />;

  const po = data?.purchaseOrder;
  if (!po) return <Alert message="Purchase Order not found." type="warning" showIcon />;

  let parsedLandingCosts: LandedCost[] = [];
  if (typeof po.landingCosts === 'string') {
    try { parsedLandingCosts = JSON.parse(po.landingCosts); } catch (e) { console.error("Failed to parse landingCosts JSON", e); }
  } else if (Array.isArray(po.landingCosts)) {
    parsedLandingCosts = po.landingCosts;
  }

  const statusColors: { [key in PurchaseOrderStatus]: string } = {
    [PurchaseOrderStatus.DRAFT]: 'blue',
    [PurchaseOrderStatus.APPROVED]: 'cyan',
    [PurchaseOrderStatus.SENT]: 'geekblue',
    [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'orange',
    [PurchaseOrderStatus.RECEIVED]: 'green',
    [PurchaseOrderStatus.CANCELLED]: 'red',
  };
  const canEdit = hasRole([Role.ADMIN, Role.MANAGER]) && po.status === PurchaseOrderStatus.DRAFT;
  const canUpdateStatus = hasRole([Role.ADMIN, Role.MANAGER]) && ![PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED].includes(po.status);
  const canReceiveItems = hasRole([Role.ADMIN, Role.MANAGER]) && ['SENT', 'APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status);
  
  const subTotalItems = po.items.reduce((sum, item) => sum + item.totalCost, 0);
  const totalLandedCosts = parsedLandingCosts.reduce((sum, cost) => sum + cost.amount, 0);

  const itemColumns = [
    { title: '#', key: 'index', render: (_: any, __: any, index: number) => index + 1 },
    { title: 'Product', dataIndex: ['product', 'name'], key: 'productName' },
    { title: 'SKU', dataIndex: ['product', 'sku'], key: 'sku' },
    { title: 'Ordered', dataIndex: 'quantityOrdered', key: 'qtyOrdered', align: 'right' as 'right' },
    { title: 'Received', dataIndex: 'quantityReceived', key: 'qtyReceived', align: 'right' as 'right' },
    { title: 'Unit Cost', dataIndex: 'unitCost', key: 'unitCost', align: 'right' as 'right', render: (cost: number) => `${currencySymbol}${cost.toFixed(2)}` },
    { title: 'Item Total', dataIndex: 'totalCost', key: 'itemTotal', align: 'right' as 'right', render: (total: number) => `${currencySymbol}${total.toFixed(2)}` },
  ];

  const landedCostColumns = [
      { title: 'Cost Name', dataIndex: 'name', key: 'name' },
      { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as 'right', render: (amount: number) => `${currencySymbol}${amount.toFixed(2)}` }
  ];
  
  // Render function for the mobile list view of items
  const renderMobileItemsList = () => (
    <List
      header={<Title level={5} style={{ margin: 0 }}>Order Items</Title>}
      dataSource={po.items}
      renderItem={(item) => (
        <List.Item>
          <Card style={{ width: '100%' }}>
            <Card.Meta
              title={item.product.name}
              description={`SKU: ${item.product.sku || 'N/A'}`}
            />
            <Divider style={{ margin: '12px 0' }}/>
            <Descriptions column={2} size="small">
                <Descriptions.Item label="Ordered">{item.quantityOrdered}</Descriptions.Item>
                <Descriptions.Item label="Received">{item.quantityReceived}</Descriptions.Item>
                <Descriptions.Item label="Unit Cost">{currencySymbol}{item.unitCost.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="Total">{currencySymbol}{item.totalCost.toFixed(2)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </List.Item>
      )}
    />
  );


  return (
    <div style={{ padding: screens.md ? '24px' : '12px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space align="center" wrap>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/purchase-orders')}>
                    Back to List
                </Button>
                <div>
                    <Title level={4} style={{ margin: 0 }}>PO: {po.poNumber}</Title>
                    <Tag color={statusColors[po.status] || 'default'}>{po.status.replace('_', ' ')}</Tag>
                </div>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              {canEdit && <Button icon={<EditOutlined />} type="dashed" onClick={() => navigate(`/admin/purchase-orders/edit/${po.id}`)}>Edit</Button>}
              {canUpdateStatus && <Button icon={<CheckCircleOutlined />} onClick={() => setIsUpdateStatusModalOpen(true)}>Update Status</Button>}
              {canReceiveItems && <Button type="primary" icon={<DeliveredProcedureOutlined />} onClick={() => setIsReceiveItemsModalOpen(true)}>Receive Items</Button>}
            </Space>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="PO Information" size="small">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Order Date">{dayjs(po.orderDate).format('YYYY-MM-DD')}</Descriptions.Item>
                <Descriptions.Item label="Expected Delivery">{po.expectedDeliveryDate ? dayjs(po.expectedDeliveryDate).format('YYYY-MM-DD') : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Created By">{po.user?.name || po.user?.email || 'N/A'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Supplier Information" size="small">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Name"><Link to={`/admin/suppliers/${po.supplier.id}`}>{po.supplier.name}</Link></Descriptions.Item>
                <Descriptions.Item label="Email">{po.supplier.email || 'N/A'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {po.notes && <Card title="Notes / Remarks" size="small"><Paragraph>{po.notes}</Paragraph></Card>}
        
        {/* Conditionally render Table for desktop or List for mobile */}
        {screens.md ? (
          <Card title="Order Items">
            <Table
              columns={itemColumns}
              dataSource={po.items}
              rowKey="id"
              pagination={false}
              bordered
              size="middle"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={6} align="right"><Text strong>Subtotal:</Text></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><Text strong>{currencySymbol}{subTotalItems.toFixed(2)}</Text></Table.Summary.Cell></Table.Summary.Row>
                  {(po.taxes ?? 0) > 0 && <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={6} align="right"><Text>Taxes:</Text></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><Text>{currencySymbol}{(po.taxes || 0).toFixed(2)}</Text></Table.Summary.Cell></Table.Summary.Row>}
                  <Table.Summary.Row style={{background: '#fafafa'}}><Table.Summary.Cell index={0} colSpan={6} align="right"><Title level={5} style={{margin:0}}>Grand Total:</Title></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><Title level={5} style={{margin:0}}>{currencySymbol}{po.totalAmount.toFixed(2)}</Title></Table.Summary.Cell></Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        ) : (
          renderMobileItemsList()
        )}
        
        <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
                <Card title="Landed Costs" size="small">
                    {parsedLandingCosts && parsedLandingCosts.length > 0 ? (
                        <Table columns={landedCostColumns} dataSource={parsedLandingCosts} rowKey="name" pagination={false} size="small" bordered/>
                    ) : (
                        <Empty description="No landed costs." />
                    )}
                </Card>
            </Col>
            
            <Col xs={24} md={12}>
                <Card title="Financial Summary" size="small">
                    <Descriptions column={1} layout="horizontal" bordered size="small">
                        <Descriptions.Item label="Items Subtotal">{currencySymbol}{subTotalItems.toFixed(2)}</Descriptions.Item>
                        <Descriptions.Item label="Landed Costs">{currencySymbol}{totalLandedCosts.toFixed(2)}</Descriptions.Item>
                        <Descriptions.Item label={<Text strong>Grand Total</Text>}><Text strong>{currencySymbol}{po.totalAmount.toFixed(2)}</Text></Descriptions.Item>
                    </Descriptions>
                </Card>
            </Col>
        </Row>
      </Space>

      {po && (
        <>
          <UpdatePOStatusModal open={isUpdateStatusModalOpen} onClose={() => { setIsUpdateStatusModalOpen(false); refetch(); }} purchaseOrder={{id: po.id, poNumber: po.poNumber, status: po.status}} />
          <ReceivePOItemsModal open={isReceiveItemsModalOpen} onClose={() => { setIsReceiveItemsModalOpen(false); refetch(); }} purchaseOrderId={po.id} />
        </>
      )}
    </div>
  );
};

export default PurchaseOrderDetailPage;
