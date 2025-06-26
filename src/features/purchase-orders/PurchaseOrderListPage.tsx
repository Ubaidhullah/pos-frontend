import React, { useState,  useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Button, Space, Tag, message, Tooltip, Typography, DatePicker, Select,  Card, Row, Col, List, Descriptions, Grid } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, DeliveredProcedureOutlined, CheckCircleOutlined,  FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import moment from 'moment';
import { Link, useNavigate } from 'react-router-dom';
import { GET_PURCHASE_ORDERS } from '../../apollo/queries/purchaseOrderQueries';
import { GET_SUPPLIERS } from '../../apollo/queries/supplierQueries'; 
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import { PurchaseOrderStatus } from '../../common/enums/purchase-order-status.enum'; 
import { Dayjs } from 'dayjs';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import UpdatePOStatusModal from './UpdatePOStatusModal';
import ReceivePOItemsModal from './ReceivePOItemsModal';


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { useBreakpoint } = Grid; // Import the useBreakpoint hook

// --- Interfaces (omitted for brevity, they are the same as your file) ---
interface SupplierInfo { id: string; name: string; }
interface ProductInfo { id: string; name: string; }
interface POItemInfo { id: string; product: ProductInfo; quantityOrdered: number; quantityReceived: number;}
interface UserInfo { id: string; name?: string; email: string; }
interface PurchaseOrderData { id: string; poNumber: string; orderDate: string; expectedDeliveryDate?: string; actualDeliveryDate?: string; status: PurchaseOrderStatus; totalAmount: number; supplier: SupplierInfo; user?: UserInfo; items: POItemInfo[]; createdAt: string; }
interface SettingsInfo { displayCurrency?: string; baseCurrency?: string; }


const PurchaseOrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const screens = useBreakpoint(); // Hook to get screen size info

  const [filters, setFilters] = useState<{
    supplierId?: string;
    status?: PurchaseOrderStatus;
    dateRange?: [Dayjs | null, Dayjs | null];
  }>({});

  const { data: suppliersData, loading: suppliersLoading } = useQuery<{ suppliers: SupplierInfo[] }>(GET_SUPPLIERS);
  const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);
  const { data, loading, error, refetch } = useQuery<{ purchaseOrders: PurchaseOrderData[] }>(GET_PURCHASE_ORDERS, {
    variables: {
      supplierId: filters.supplierId,
      status: filters.status,
      startDate: filters.dateRange?.[0]?.startOf('day').toISOString(),
      endDate: filters.dateRange?.[1]?.endOf('day').toISOString(),
    },
    notifyOnNetworkStatusChange: true,
  });

  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [isReceiveItemsModalOpen, setIsReceiveItemsModalOpen] = useState(false);
  const [selectedPOForAction, setSelectedPOForAction] = useState<PurchaseOrderData | null>(null);

  const currencySymbol = useMemo(() => {
          return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
        }, [settingsData]);

  const handleFilterChange = (filterName: string, value: any) => { setFilters(prev => ({ ...prev, [filterName]: value })); };
  const applyFilters = () => { refetch(); };
  const resetFilters = () => { setFilters({}); refetch({ supplierId: undefined, status: undefined, startDate: undefined, endDate: undefined }); }

  const openUpdateStatusModal = (po: PurchaseOrderData) => { setSelectedPOForAction(po); setIsUpdateStatusModalOpen(true); };
  const openReceiveItemsModal = (po: PurchaseOrderData) => { setSelectedPOForAction(po); setIsReceiveItemsModalOpen(true); };

  if (error) message.error(`Error loading purchase orders: ${error.message}`);

  const statusColors: { [key in PurchaseOrderStatus]: string } = {
    [PurchaseOrderStatus.DRAFT]: 'blue',
    [PurchaseOrderStatus.APPROVED]: 'cyan',
    [PurchaseOrderStatus.SENT]: 'geekblue',
    [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'orange',
    [PurchaseOrderStatus.RECEIVED]: 'green',
    [PurchaseOrderStatus.CANCELLED]: 'red',
  };
  
  // --- Columns definition for Desktop View ---
  const desktopColumns = [
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', render: (text: string, record: PurchaseOrderData) => <Link to={`/admin/purchase-orders/${record.id}`}>{text}</Link>, sorter: (a: PurchaseOrderData, b: PurchaseOrderData) => a.poNumber.localeCompare(b.poNumber) },
    { title: 'Supplier', dataIndex: ['supplier', 'name'], key: 'supplierName', sorter: (a: PurchaseOrderData, b: PurchaseOrderData) => a.supplier.name.localeCompare(b.supplier.name) },
    { title: 'Order Date', dataIndex: 'orderDate', key: 'orderDate', render: (date: string) => moment(date).format('YYYY-MM-DD'), sorter: (a: PurchaseOrderData, b: PurchaseOrderData) => moment(a.orderDate).unix() - moment(b.orderDate).unix() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: PurchaseOrderStatus) => <Tag color={statusColors[status] || 'default'}>{status.replace('_', ' ')}</Tag> },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right' as 'right', render: (amount: number) => `${currencySymbol}${amount.toFixed(2)}`, sorter: (a: PurchaseOrderData, b: PurchaseOrderData) => a.totalAmount - b.totalAmount },
    { title: 'Actions', key: 'actions', fixed: 'right' as 'right', width: 120, render: (_: any, record: PurchaseOrderData) => (
        <Space>
          <Tooltip title="View Details"><Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/admin/purchase-orders/${record.id}`)} /></Tooltip>
          {hasRole([Role.ADMIN, Role.MANAGER]) && record.status === PurchaseOrderStatus.DRAFT && (
            <Tooltip title="Edit Draft PO"><Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/admin/purchase-orders/edit/${record.id}`)} /></Tooltip>
          )}
          {hasRole([Role.ADMIN, Role.MANAGER]) && [PurchaseOrderStatus.SENT, PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(record.status) && (
            <Tooltip title="Receive Items"><Button size="small" icon={<DeliveredProcedureOutlined />} onClick={() => openReceiveItemsModal(record)} /></Tooltip>
          )}
          {hasRole([Role.ADMIN, Role.MANAGER]) && ![PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED].includes(record.status) && (
            <Tooltip title="Update Status">
              <Button size="small" icon={<CheckCircleOutlined />} onClick={() => openUpdateStatusModal(record)} />
            </Tooltip>
          )}
        </Space>
    )},
  ];

  // --- Render logic for Mobile View (List of Cards) ---
  const renderMobileList = () => (
    <List
      loading={loading}
      dataSource={data?.purchaseOrders}
      renderItem={(po) => (
        <List.Item>
          <Card
            style={{ width: '100%' }}
            title={`PO: ${po.poNumber}`}
            extra={<Link to={`/admin/purchase-orders/${po.id}`}>Details</Link>}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Supplier">{po.supplier.name}</Descriptions.Item>
              <Descriptions.Item label="Order Date">{moment(po.orderDate).format('YYYY-MM-DD')}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={statusColors[po.status] || 'default'}>{po.status.replace('_', ' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Total"><Text strong>{currencySymbol}{po.totalAmount.toFixed(2)}</Text></Descriptions.Item>
            </Descriptions>
          </Card>
        </List.Item>
      )}
    />
  );

  return (
    <div>
      <Row gutter={[16, 16]} justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Purchase Orders</Title>
        </Col>
        <Col>
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/purchase-orders/new')}>
              Create PO
            </Button>
          )}
        </Col>
      </Row>

      <Card title="Filters" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Select placeholder="Filter by Supplier" style={{ width: '100%' }} onChange={(value) => handleFilterChange('supplierId', value)} loading={suppliersLoading} allowClear value={filters.supplierId} showSearch filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}>
              {suppliersData?.suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select placeholder="Filter by Status" style={{ width: '100%' }} onChange={(value) => handleFilterChange('status', value)} allowClear value={filters.status}>
              {Object.values(PurchaseOrderStatus).map(s => <Option key={s} value={s}>{s.replace('_', ' ')}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={10}>
            <RangePicker style={{ width: '100%' }} onChange={(dates) => handleFilterChange('dateRange', dates)} value={filters.dateRange} />
          </Col>
          <Col xs={24} style={{ textAlign: 'right' }}>
            <Space>
                <Button onClick={resetFilters}><ReloadOutlined /> Reset</Button>
                <Button type="primary" icon={<FilterOutlined />} onClick={applyFilters} loading={loading}>Apply</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {/* Conditionally render Table for desktop or List for mobile */}
      {screens.md ? (
        <Table
            columns={desktopColumns}
            dataSource={data?.purchaseOrders}
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 'max-content' }}
        />
      ) : (
        renderMobileList()
      )}

      {selectedPOForAction && (
          <>
            <UpdatePOStatusModal open={isUpdateStatusModalOpen} onClose={() => { setIsUpdateStatusModalOpen(false); setSelectedPOForAction(null); refetch(); }} purchaseOrder={selectedPOForAction} />
            <ReceivePOItemsModal open={isReceiveItemsModalOpen} onClose={() => { setIsReceiveItemsModalOpen(false); setSelectedPOForAction(null); refetch(); }} purchaseOrderId={selectedPOForAction.id} />
          </>
      )}
    </div>
  );
};

export default PurchaseOrderListPage;
