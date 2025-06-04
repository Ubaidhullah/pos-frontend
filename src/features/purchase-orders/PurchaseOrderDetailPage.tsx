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
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeliveredProcedureOutlined,
  CheckCircleOutlined,
  PrinterOutlined, // For a conceptual print button
} from '@ant-design/icons';
import moment from 'moment';
import { GET_PURCHASE_ORDER_BY_ID } from '../../apollo/queries/purchaseOrderQueries';
import { PurchaseOrderStatus } from '../../common/enums/purchase-order-status.enum'; // Frontend enum
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';

// Import Modals if actions are triggered directly from this page
import UpdatePOStatusModal from './UpdatePOStatusModal';
import ReceivePOItemsModal from './ReceivePOItemsModal';

const { Title, Text, Paragraph } = Typography;

// Interfaces for expected data structure (can be more detailed based on your GQL types)
interface ProductDetail { id: string; name: string; sku?: string; }
interface POItemDetailForView {
  id: string;
  product: ProductDetail;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}
interface SupplierDetail { id: string; name: string; email?: string; phone?: string; address?: string;}
interface UserDetail { id: string; name?: string; email: string; }

interface PurchaseOrderFullDetail {
  id: string;
  poNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes?: string;
  shippingCost?: number;
  taxes?: number;
  supplier: SupplierDetail;
  user?: UserDetail;
  items: POItemDetailForView[];
  createdAt: string;
  updatedAt: string;
}

const PurchaseOrderDetailPage: React.FC = () => {
  const { id: poId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const { data, loading, error, refetch } = useQuery<{ purchaseOrder: PurchaseOrderFullDetail }>(
    GET_PURCHASE_ORDER_BY_ID,
    {
      variables: { id: poId },
      fetchPolicy: 'cache-and-network', // Ensure fresh data but use cache initially
      onError: (err) => {
        message.error(`Error loading PO details: ${err.message}`);
      }
    }
  );

  // State for action modals if triggering from here
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [isReceiveItemsModalOpen, setIsReceiveItemsModalOpen] = useState(false);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" tip="Loading Purchase Order Details..." /></div>;
  }
  if (error || !data?.purchaseOrder) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error Loading Purchase Order"
          description={error?.message || 'The purchase order could not be found or loaded.'}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/admin/purchase-orders')}>
              Back to List
            </Button>
          }
        />
      </div>
    );
  }

  const po = data.purchaseOrder;

  const statusColors: { [key in PurchaseOrderStatus]: string } = {
    [PurchaseOrderStatus.DRAFT]: 'blue',
    [PurchaseOrderStatus.APPROVED]: 'cyan',
    [PurchaseOrderStatus.SENT]: 'geekblue',
    [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'orange',
    [PurchaseOrderStatus.RECEIVED]: 'green',
    [PurchaseOrderStatus.CANCELLED]: 'red',
  };

  const itemColumns = [
    { title: '#', key: 'index', render: (_text: any, _record: any, index: number) => index + 1, width: 50 },
    { title: 'Product', dataIndex: ['product', 'name'], key: 'productName', render: (name: string, record: POItemDetailForView) => <Link to={`/admin/products/${record.product.id}`}>{name}</Link>},
    { title: 'SKU', dataIndex: ['product', 'sku'], key: 'sku', render: (sku?:string) => sku || 'N/A' },
    { title: 'Ordered', dataIndex: 'quantityOrdered', key: 'qtyOrdered', align: 'right' as 'right' },
    { title: 'Received', dataIndex: 'quantityReceived', key: 'qtyReceived', align: 'right' as 'right', render: (qty: number, record: POItemDetailForView) => <Text type={qty < record.quantityOrdered ? 'warning' : 'success'}>{qty}</Text> },
    { title: 'Unit Cost', dataIndex: 'unitCost', key: 'unitCost', align: 'right'as 'right', render: (cost: number) => `$${cost.toFixed(2)}` },
    { title: 'Item Total', dataIndex: 'totalCost', key: 'itemTotal', align: 'right'as 'right', render: (total: number) => `$${total.toFixed(2)}` },
  ];

  const canEdit = hasRole([Role.ADMIN, Role.MANAGER]) && po.status === PurchaseOrderStatus.DRAFT;
  const canUpdateStatus = hasRole([Role.ADMIN, Role.MANAGER]) && ![PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED].includes(po.status);
  const canReceiveItems = hasRole([Role.ADMIN, Role.MANAGER]) && [PurchaseOrderStatus.SENT, PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(po.status);

  const subTotalItems = po.items.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
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

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Card title="PO Information">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="PO Number">{po.poNumber}</Descriptions.Item>
                <Descriptions.Item label="Order Date">{moment(po.orderDate).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Expected Delivery">{po.expectedDeliveryDate ? moment(po.expectedDeliveryDate).format('YYYY-MM-DD') : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Actual Delivery">{po.actualDeliveryDate ? moment(po.actualDeliveryDate).format('YYYY-MM-DD') : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusColors[po.status] || 'default'}>{po.status.replace('_', ' ')}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Created By">{po.user?.name || po.user?.email || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Created At">{moment(po.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Last Updated">{moment(po.updatedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
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
                { (po.shippingCost !== null && po.shippingCost !== undefined && po.shippingCost > 0) &&
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} align="right"><Text>Shipping Cost:</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><Text>${(po.shippingCost || 0).toFixed(2)}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                }
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