import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, Modal, message, Popconfirm, Tooltip, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { GET_CUSTOMERS } from '../../apollo/queries/customerQueries';
import { DELETE_CUSTOMER } from '../../apollo/mutations/customerMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import CustomerForm from './CustomerForm';

const { Search } = Input;

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

const CustomerListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, loading, error, refetch } = useQuery<{ customers: Customer[] }>(GET_CUSTOMERS, {
    variables: { searchTerm }, // Pass searchTerm to query
    // fetchPolicy: "cache-and-network", // Consider fetch policy for search
  });
  const [deleteCustomerMutation, { loading: deleteLoading }] = useMutation(DELETE_CUSTOMER);
  const { hasRole } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // refetch({ searchTerm: value }); // Apollo client usually refetches automatically if variables change
  };

  const showAddModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const showEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    refetch({ searchTerm }); // Refetch customers after add/edit, preserving search term
  };

  const handleDelete = async (customerId: string) => {
    try {
      await deleteCustomerMutation({
        variables: { id: customerId },
        refetchQueries: [{ query: GET_CUSTOMERS, variables: { searchTerm } }],
      });
      message.success('Customer deleted successfully');
    } catch (e: any) {
      message.error(`Error deleting customer: ${e.message}`);
    }
  };

  if (error) {
    message.error(`Error loading customers: ${error.message}`);
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: Customer, b: Customer) => a.name.localeCompare(b.name) },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Customer) => (
        <Space size="middle">
          {hasRole([Role.ADMIN, Role.MANAGER, Role.CASHIER]) && ( // Cashiers might edit too
            <Tooltip title="Edit Customer">
              <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
            </Tooltip>
          )}
          {hasRole([Role.ADMIN, Role.MANAGER]) && ( // Only managers/admins delete
            <Popconfirm
              title="Delete the customer"
              description="Are you sure to delete this customer?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ loading: deleteLoading }}
            >
              <Tooltip title="Delete Customer">
                <Button icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Customer Management</h2>
        {hasRole([Role.ADMIN, Role.MANAGER, Role.CASHIER]) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            Add Customer
          </Button>
        )}
      </div>
      <Search
        placeholder="Search customers by name, email, or phone"
        onSearch={handleSearch}
        onChange={(e) => !e.target.value && handleSearch('')} // Clear search when input is empty
        style={{ marginBottom: 16, width: 300 }}
        allowClear
        enterButton={<Button icon={<SearchOutlined />}>Search</Button>}
      />
      <Table
        columns={columns}
        dataSource={data?.customers}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
      <CustomerForm
        open={isModalOpen}
        onClose={handleModalClose}
        customerToEdit={editingCustomer}
      />
    </div>
  );
};

export default CustomerListPage;