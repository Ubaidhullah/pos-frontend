import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, message, Popconfirm, Tooltip, Typography, Tag, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import { GET_SUPPLIERS, GET_SUPPLIER_BY_ID } from '../../apollo/queries/supplierQueries';
import { DELETE_SUPPLIER } from '../../apollo/mutations/supplierMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import SupplierFormModal, { type SupplierToEdit } from './SupplierFormModal';
import ManageSupplierProductsModal from './ManageSupplierProductsModal';

const { Title } = Typography;
const { Search } = Input;

interface ProductSupplierLinkBasic {
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
    };
    costPrice?: number;
    supplierProductCode?: string;
  }
  
interface SupplierData {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  productsSupplied?: ProductSupplierLinkBasic[];
}

const SupplierListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, loading, error, refetch } = useQuery<{ suppliers: SupplierData[] }>(GET_SUPPLIERS);
  const [deleteSupplierMutation, { loading: deleteLoading }] = useMutation(DELETE_SUPPLIER);
  const { hasRole } = useAuth();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierToEdit | null>(null);

  const [isManageProductsModalOpen, setIsManageProductsModalOpen] = useState(false);
  const [selectedSupplierForProducts, setSelectedSupplierForProducts] = useState<SupplierData | null>(null);

  // Fetch full details for selected supplier when managing products
  // Using a lazy query might be better if productsSupplied details are heavy and not needed in main list.
  // For now, GET_SUPPLIER_BY_ID will be triggered if needed.
  // Alternatively, ensure GET_SUPPLIERS returns enough detail in productsSupplied for the manage modal.

  const handleSearch = (value: string) => {
    setSearchTerm(value.toLowerCase());
    // Client-side filtering. For server-side, pass searchTerm to GET_SUPPLIERS query variables.
  };

  const showAddModal = () => {
    setEditingSupplier(null);
    setIsFormModalOpen(true);
  };

  const showEditModal = (supplier: SupplierData) => {
    // Map SupplierData to SupplierToEdit if needed, or ensure they are compatible
    setEditingSupplier(supplier as SupplierToEdit);
    setIsFormModalOpen(true);
  };

  const handleFormModalClose = () => {
    setIsFormModalOpen(false);
    setEditingSupplier(null);
    refetch();
  };

  const showManageProductsModal = (supplier: SupplierData) => {
    // Here you might want to fetch the supplier again with full productsSupplied details if necessary
    // For this example, we assume GET_SUPPLIERS provided enough or ManageSupplierProductsModal fetches its own if needed.
    setSelectedSupplierForProducts(supplier);
    setIsManageProductsModalOpen(true);
  };

  const handleManageProductsModalClose = () => {
    setIsManageProductsModalOpen(false);
    setSelectedSupplierForProducts(null);
    refetch(); // Refetch suppliers list as productsSupplied count might change or other summary
  };

  const handleDelete = async (supplierId: string) => {
    try {
      await deleteSupplierMutation({
        variables: { id: supplierId },
        refetchQueries: [{ query: GET_SUPPLIERS }],
      });
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

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: SupplierData, b: SupplierData) => a.name.localeCompare(b.name) },
    { title: 'Contact Name', dataIndex: 'contactName', key: 'contactName', render: (name?:string) => name || <Tag>N/A</Tag>},
    { title: 'Email', dataIndex: 'email', key: 'email', render: (email?:string) => email || <Tag>N/A</Tag>},
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (phone?:string) => phone || <Tag>N/A</Tag>},
    { title: 'Products Linked', key: 'productsCount', render: (_:any, record: SupplierData) => record.productsSupplied?.length || 0 },
    { title: 'Added On', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => moment(date).format('YYYY-MM-DD'), sorter: (a: SupplierData, b: SupplierData) => moment(a.createdAt).unix() - moment(b.createdAt).unix()},
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SupplierData) => (
        <Space size="small" wrap>
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Tooltip title="Edit Supplier Details">
              <Button size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)} />
            </Tooltip>
          )}
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Tooltip title="Manage Products for this Supplier">
              <Button size="small" icon={<ShopOutlined />} onClick={() => showManageProductsModal(record)} />
            </Tooltip>
          )}
          {hasRole([Role.ADMIN]) && (
            <Popconfirm
              title="Delete this supplier?"
              description="This action cannot be undone. Ensure no active POs are linked."
              onConfirm={() => handleDelete(record.id)}
              okText="Yes, Delete"
              cancelText="No"
              okButtonProps={{ loading: deleteLoading }}
            >
              <Tooltip title="Delete Supplier">
                <Button size="small" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <Title level={2} style={{margin: 0}}>Supplier Management</Title>
        {hasRole([Role.ADMIN, Role.MANAGER]) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            Add Supplier
          </Button>
        )}
      </div>
      <Search
            placeholder="Search by name, email, contact"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ marginBottom: 16, width: '100%', maxWidth: 400 }}
            allowClear
            enterButton={<Button icon={<SearchOutlined />}>Search</Button>}
      />
      <Table
        columns={columns}
        dataSource={filteredSuppliers}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
      />
      <SupplierFormModal
        open={isFormModalOpen}
        onClose={handleFormModalClose}
        supplierToEdit={editingSupplier}
      />
      {selectedSupplierForProducts && ( // Ensure modal is only rendered when a supplier is selected
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