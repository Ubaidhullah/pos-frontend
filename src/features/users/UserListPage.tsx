import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Button, Space, Tag, message, Tooltip, Typography } from 'antd';
import { EditOutlined, UserSwitchOutlined } from '@ant-design/icons';
import moment from 'moment';
import { GET_USERS } from '../../apollo/queries/userQueries';
import { useAuth } from '../../contexts/AuthContext'; // For role checking if needed, though page access is primary
import { Role } from '../../common/enums/role.enum';
import UpdateUserRoleModal from './UpdateUserRoleModal'; // Import the modal
import type { ColumnsType } from 'antd/es/table';


const { Title } = Typography;

interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  createdAt: string; // Or Date if parsed
}

const UserListPage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<{ users: User[] }>(GET_USERS);
  const { user: currentUser, hasRole } = useAuth(); // Get current user for role checking if needed

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const showUpdateRoleModal = (userToEdit: User) => {
    // Admin should not be able to change their own role via this UI to prevent self-lockout
    // Or change roles of other Admins if that's a business rule.
    if (currentUser && userToEdit.id === currentUser.id && userToEdit.role === Role.ADMIN) {
        message.warning("Administrators cannot change their own role through this interface.");
        return;
    }
    setEditingUser(userToEdit);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    // refetch(); // Modal's onCompleted already refetches GET_USERS
  };

  if (error) {
    message.error(`Error loading users: ${error.message}`);
    return <p>Error loading users. Check console.</p>;
  }

  const roleColors: { [key in Role]: string } = {
    [Role.CASHIER]: 'blue',
    [Role.MANAGER]: 'orange',
    [Role.ADMIN]: 'red',
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name?: string, record?: User) =>
        name || record?.email.split('@')[0] || 'N/A',
      sorter: (a, b) => (a.name || a.email).localeCompare(b.name || b.email),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: Role) => (
        <Tag color={roleColors[role] || 'default'}>
          {role.toUpperCase()}
        </Tag>
      ),
      filters: Object.values(Role).map(role => ({
        text: role,
        value: role,
      })),
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Joined On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => moment(date).format('YYYY-MM-DD'),
      sorter: (a, b) => moment(a.createdAt).unix() - moment(b.createdAt).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          {hasRole([Role.ADMIN]) && (
            <Tooltip title="Change User Role">
              <Button
                icon={<UserSwitchOutlined />}
                onClick={() => showUpdateRoleModal(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];
  
 
  console.log("Current user:", currentUser);
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>User Management</Title>
        {/* No "Add User" button here, as user creation is via 'Register' in AuthModule for now.
            If Admins should create users directly, you'd add a form and mutation for that. */}
      </div>
      <Table
        columns={columns}
        dataSource={data?.users}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />
      {editingUser && ( // Conditionally render modal only when there's a user to edit
         <UpdateUserRoleModal
            open={isModalOpen}
            onClose={handleModalClose}
            userToUpdate={editingUser}
        />
      )}
    </div>
  );
};

export default UserListPage;