import React, { useState } from 'react';
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

const { Title, Text, Paragraph } = Typography;

// --- Interfaces for data structures ---
interface LandedCost {
  name: string;
  amount: number;
}
interface SupplierDetail { id: string; name: string; email?: string; phone?: string; address?: string;}
interface UserDetail { id: string; name?: string; email: string; }

interface PurchaseOrderFullDetail {
  updatedAt: string | number | Date | null | undefined;
  createdAt: string | number | Date | null | undefined;
  id: string;
  poNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes?: string;
  taxes?: number; // 👈 Add taxes
  landingCosts?: LandedCost[] | string;// 👈 Add landed costs
  //   supplier: { id: string; name: string; email?: string; phone?: string; address?: string; };
  supplier: SupplierDetail;
  user?: UserDetail;
  items: {
    id: string;
    product: { id: string; name: string; sku?: string; };
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    totalCost: number;
  }[];
}

const PurchaseOrderDetailPage: React.FC = () => {
  const { id: poId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const { data, loading, error, refetch } = useQuery<{ purchaseOrder: PurchaseOrderFullDetail }>(
    GET_PURCHASE_ORDER_BY_ID,
    {
      variables: { id: poId },
      fetchPolicy: 'cache-and-network',
    }
  );

  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [isReceiveItemsModalOpen, setIsReceiveItemsModalOpen] = useState(false);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  if (error) return <Alert message="Error Loading Purchase Order" description={error.message} type="error" showIcon />;

  const po = data?.purchaseOrder;
  if (!po) return <Alert message="Purchase Order not found." type="warning" showIcon />;

  let parsedLandingCosts: LandedCost[] = [];
  if (typeof po.landingCosts === 'string') {
    try {
      parsedLandingCosts = JSON.parse(po.landingCosts);
    } catch (e) {
      console.error("Failed to parse landingCosts JSON", e);
    }
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
    { title: 'Unit Cost', dataIndex: 'unitCost', key: 'unitCost', align: 'right' as 'right', render: (cost: number) => `$${cost.toFixed(2)}` },
    { title: 'Item Total', dataIndex: 'totalCost', key: 'itemTotal', align: 'right' as 'right', render: (total: number) => `$${total.toFixed(2)}` },
  ];

  const landedCostColumns = [
      { title: 'Cost Name', dataIndex: 'name', key: 'name' },
      { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as 'right', render: (amount: number) => `$${amount.toFixed(2)}` }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* --- Header and Action Buttons --- */}
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/purchase-orders')}>
                    Back to List
                </Button>
                <Title level={2} style={{ margin: 0 }}>Purchase Order: {po.poNumber}</Title>
                <Tag color={statusColors[po.status] || 'default'} style={{ marginLeft: 8, fontSize: '1em', padding: '4px 8px' }}>
                    {po.status.replace('_', ' ')}
                </Tag>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<PrinterOutlined />} onClick={() => { message.info("Print functionality to be implemented."); window.print(); /* Basic browser print */ }}>Print PO</Button>
              {canEdit && (
                <Button icon={<EditOutlined />} type="dashed" onClick={() => navigate(`/admin/purchase-orders/edit/${po.id}`)}>
                  Edit Draft
                </Button>
              )}
              {canUpdateStatus && (
                <Button icon={<CheckCircleOutlined />} onClick={() => setIsUpdateStatusModalOpen(true)}>
                  Update Status
                </Button>
              )}
              {canReceiveItems && (
                <Button type="primary" icon={<DeliveredProcedureOutlined />} onClick={() => setIsReceiveItemsModalOpen(true)}>
                  Receive Items
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* --- PO and Supplier Details --- */}
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Card title="PO Information">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="PO Number">{po.poNumber}</Descriptions.Item>
                <Descriptions.Item label="Order Date">{dayjs(po.orderDate).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Expected Delivery">{po.expectedDeliveryDate ? dayjs(po.expectedDeliveryDate).format('YYYY-MM-DD') : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Actual Delivery">{po.actualDeliveryDate ? dayjs(po.actualDeliveryDate).format('YYYY-MM-DD') : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusColors[po.status] || 'default'}>{po.status.replace('_', ' ')}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Created By">{po.user?.name || po.user?.email || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Created At">{dayjs(po.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Last Updated">{dayjs(po.updatedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Supplier Information">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Supplier Name"><Link to={`/admin/suppliers/${po.supplier.id}`}>{po.supplier.name}</Link></Descriptions.Item>
                <Descriptions.Item label="Email">{po.supplier.email || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Phone">{po.supplier.phone || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Address"><Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>{po.supplier.address || 'N/A'}</Paragraph></Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {po.notes && (
            <Card title="Notes / Remarks" style={{marginTop: 24}}>
                <Paragraph>{po.notes}</Paragraph>
            </Card>
        )}

        <Card title="Order Items" style={{ marginTop: 24 }}>
          <Table
            columns={itemColumns}
            dataSource={po.items}
            rowKey="id"
            pagination={false}
            bordered
            size="middle"
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={6} align="right"><Text strong>Subtotal (Items):</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong>${subTotalItems.toFixed(2)}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
                 { (po.taxes !== null && po.taxes !== undefined && po.taxes > 0) &&
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} align="right"><Text>Taxes:</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><Text>${(po.taxes || 0).toFixed(2)}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                }
                <Table.Summary.Row style={{background: '#fafafa'}}>
                  <Table.Summary.Cell index={0} colSpan={6} align="right"><Title level={5} style={{margin:0}}>Grand Total:</Title></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Title level={5} style={{margin:0}}>${po.totalAmount.toFixed(2)}</Title></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Card>

        {/* 👇 NEW Landed Costs Card */}
        <Row gutter={24}>
            <Col xs={24} md={12}>
                <Card title="Landed Costs">
                    {parsedLandingCosts && parsedLandingCosts.length > 0 ? (
                        <Table columns={landedCostColumns} dataSource={parsedLandingCosts} rowKey="name" pagination={false} size="small" bordered/>
                    ) : (
                        <Empty description="No additional landed costs were added." />
                    )}
                </Card>
            </Col>
            
            {/* --- Summary Calculation --- */}
            <Col xs={24} md={12}>
                <Card title="Financial Summary">
                    <Descriptions column={1} layout="horizontal" bordered size="small">
                        <Descriptions.Item label="Items Subtotal">${subTotalItems.toFixed(2)}</Descriptions.Item>
                        <Descriptions.Item label="Total Landed Costs">${totalLandedCosts.toFixed(2)}</Descriptions.Item>
                        <Descriptions.Item label={<Text strong>Grand Total</Text>}><Text strong>${po.totalAmount.toFixed(2)}</Text></Descriptions.Item>
                    </Descriptions>
                </Card>
            </Col>
        </Row>
      </Space>

      {/* Modals for actions */}
      {po && (
        <>
          <UpdatePOStatusModal
            open={isUpdateStatusModalOpen}
            onClose={() => { setIsUpdateStatusModalOpen(false); refetch(); /* Refetch to update details on this page */ }}
            purchaseOrder={{id: po.id, poNumber: po.poNumber, status: po.status}}
          />
          <ReceivePOItemsModal
            open={isReceiveItemsModalOpen}
            onClose={() => { setIsReceiveItemsModalOpen(false); refetch(); /* Refetch to update details on this page */}}
            purchaseOrderId={po.id}
          />
        </>
      )}
    </div>
  );
};

export default PurchaseOrderDetailPage;
