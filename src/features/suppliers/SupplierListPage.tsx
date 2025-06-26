import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, message, Popconfirm, Tooltip, Typography, Tag, Input, List, Card, Descriptions, Grid, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import { GET_SUPPLIERS, GET_SUPPLIER_BY_ID } from '../../apollo/queries/supplierQueries';
import { DELETE_SUPPLIER } from '../../apollo/mutations/supplierMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import SupplierFormModal, { type SupplierToEdit } from './SupplierFormModal';
import ManageSupplierProductsModal from './ManageSupplierProductsModal';

const { Title, Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;

// --- Interfaces (omitted for brevity, same as your file) ---
interface ProductSupplierLinkBasic { id: string; productId: string; product: { id: string; name: string; }; costPrice?: number; supplierProductCode?: string; }
interface SupplierData { id: string; name: string; contactName?: string; email?: string; phone?: string; address?: string; createdAt: string; productsSupplied?: ProductSupplierLinkBasic[]; }


const SupplierListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, loading, error, refetch } = useQuery<{ suppliers: SupplierData[] }>(GET_SUPPLIERS);
  const [deleteSupplierMutation, { loading: deleteLoading }] = useMutation(DELETE_SUPPLIER);
  const { hasRole } = useAuth();
  const screens = useBreakpoint();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierToEdit | null>(null);

  const [isManageProductsModalOpen, setIsManageProductsModalOpen] = useState(false);
  const [selectedSupplierForProducts, setSelectedSupplierForProducts] = useState<SupplierData | null>(null);

  const handleSearch = (value: string) => { setSearchTerm(value.toLowerCase()); };
  const showAddModal = () => { setEditingSupplier(null); setIsFormModalOpen(true); };
  const showEditModal = (supplier: SupplierData) => { setEditingSupplier(supplier as SupplierToEdit); setIsFormModalOpen(true); };
  const handleFormModalClose = () => { setIsFormModalOpen(false); setEditingSupplier(null); refetch(); };
  const showManageProductsModal = (supplier: SupplierData) => { setSelectedSupplierForProducts(supplier); setIsManageProductsModalOpen(true); };
  const handleManageProductsModalClose = () => { setIsManageProductsModalOpen(false); setSelectedSupplierForProducts(null); refetch(); };

  const handleDelete = async (supplierId: string) => {
    try {
      await deleteSupplierMutation({ variables: { id: supplierId }, refetchQueries: [{ query: GET_SUPPLIERS }], });
      message.success('Supplier deleted successfully');
    } catch (e: any) {
      message.error(`Error deleting supplier: ${e.message}`);
    }
  };

  if (error) message.error(`Error loading suppliers: ${error.message}`);

  const filteredSuppliers = data?.suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm)) ||
    (supplier.contactName && supplier.contactName.toLowerCase().includes(searchTerm))
  );

  const desktopColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: SupplierData, b: SupplierData) => a.name.localeCompare(b.name) },
    { title: 'Contact Name', dataIndex: 'contactName', key: 'contactName', render: (name?:string) => name || <Tag>N/A</Tag>},
    { title: 'Email', dataIndex: 'email', key: 'email', render: (email?:string) => email || <Tag>N/A</Tag>},
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (phone?:string) => phone || <Tag>N/A</Tag>},
    { title: 'Products Linked', key: 'productsCount', align: 'center' as 'center', render: (_:any, record: SupplierData) => record.productsSupplied?.length || 0 },
    { title: 'Added On', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => moment(date).format('YYYY-MM-DD'), sorter: (a: SupplierData, b: SupplierData) => moment(a.createdAt).unix() - moment(b.createdAt).unix()},
    {
      title: 'Actions', key: 'actions', fixed: 'right' as 'right', width: 150,
      render: (_: any, record: SupplierData) => (
        <Space size="small">
          {hasRole([Role.ADMIN, Role.MANAGER]) && <Tooltip title="Edit Details"><Button size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)} /></Tooltip>}
          {hasRole([Role.ADMIN, Role.MANAGER]) && <Tooltip title="Manage Products"><Button size="small" icon={<ShopOutlined />} onClick={() => showManageProductsModal(record)} /></Tooltip>}
          {hasRole([Role.ADMIN]) && <Popconfirm title="Delete this supplier?" onConfirm={() => handleDelete(record.id)} okText="Yes, Delete" okButtonProps={{ loading: deleteLoading }}><Tooltip title="Delete Supplier"><Button size="small" icon={<DeleteOutlined />} danger /></Tooltip></Popconfirm>}
        </Space>
      ),
    },
  ];
  
  const renderMobileList = () => (
    <List
        loading={loading}
        dataSource={filteredSuppliers}
        renderItem={(supplier) => (
            <List.Item>
                <Card 
                    style={{ width: '100%' }}
                    title={supplier.name}
                    actions={[
                        <Tooltip title="Edit Details"><Button type="text" icon={<EditOutlined />} onClick={() => showEditModal(supplier)} /></Tooltip>,
                        <Tooltip title="Manage Products"><Button type="text" icon={<ShopOutlined />} onClick={() => showManageProductsModal(supplier)} /></Tooltip>,
                        <Popconfirm title="Delete?" onConfirm={() => handleDelete(supplier.id)} okText="Yes"><Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm>
                    ]}
                >
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label="Contact">{supplier.contactName || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Email">{supplier.email || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{supplier.phone || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Products Linked">{supplier.productsSupplied?.length || 0}</Descriptions.Item>
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
            <Title level={2} style={{margin: 0}}>Supplier Management</Title>
        </Col>
        <Col>
            {hasRole([Role.ADMIN, Role.MANAGER]) && (
                <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
                    Add Supplier
                </Button>
            )}
        </Col>
      </Row>
      <Card style={{ marginBottom: 16 }}>
        <Search
                placeholder="Search by name, email, or contact"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                enterButton
        />
      </Card>

      {/* Conditionally render Table for desktop or List for mobile */}
      {screens.md ? (
        <Table
            columns={desktopColumns}
            dataSource={filteredSuppliers}
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 'max-content' }}
        />
      ) : (
        renderMobileList()
      )}
      
      <SupplierFormModal
        open={isFormModalOpen}
        onClose={handleFormModalClose}
        supplierToEdit={editingSupplier}
      />
      {selectedSupplierForProducts && (
        <ManageSupplierProductsModal
            open={isManageProductsModalOpen}
            onClose={handleManageProductsModalClose}
            supplier={selectedSupplierForProducts}
        />
      )}
    </div>
  );
};

export default SupplierListPage;
