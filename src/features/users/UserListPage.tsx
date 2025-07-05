import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Button, Space, Tag, message, Tooltip, Typography, Card, Row, Col, List, Descriptions, Grid, Input } from 'antd';
import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import { GET_USERS } from '../../apollo/queries/userQueries';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import UserFormModal, { type UserToEdit } from './CreateUserModal'; // 👈 Import the new unified modal
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// Updated interface to include the new field
interface User extends UserToEdit {
  id: string;
  name: any;
  email: any;
  role: any;
  telegramChatId: string;
  createdAt: string;
}

const UserListPage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<{ users: User[] }>(GET_USERS);
  const { user: currentUser, hasRole } = useAuth();
  const screens = useBreakpoint();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserToEdit | null>(null);

  const showFormModal = (userToEdit?: UserToEdit) => {
    // Prevent a non-ADMIN from editing an ADMIN or ADMIN
    if (userToEdit && userToEdit.role === Role.ADMIN && !hasRole([Role.ADMIN])) {
      message.error("You do not have permission to edit an Administrator.");
      return;
    }
    // Prevent anyone from editing a ADMIN
    if (userToEdit && userToEdit.role === Role.ADMIN) {
        message.error("Super Administrator cannot be edited.");
        return;
    }
    
    setEditingUser(userToEdit || null);
    setIsFormModalOpen(true);
  };

  const handleModalClose = () => {
    setIsFormModalOpen(false);
    setEditingUser(null);
    // The modal's onCompleted handler already refetches GET_USERS
  };

  if (error) {
    message.error(`Error loading users: ${error.message}`);
  }

  const roleColors: { [key in Role]: string } = {
    [Role.CASHIER]: 'blue',
    [Role.MANAGER]: 'orange',
    [Role.ADMIN]: 'purple',
  };

  const desktopColumns: ColumnsType<User> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => (a.name || a.email).localeCompare(b.name || b.email) },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role', render: (role: Role) => <Tag color={roleColors[role] || 'default'}>{role.toUpperCase()}</Tag> },
    // --- NEW COLUMN ---
    { title: 'Telegram Chat ID', dataIndex: 'telegramChatId', key: 'telegramChatId', render: (id?: string) => id || <Text type="secondary">N/A</Text> },
    { title: 'Joined On', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => moment(date).format('YYYY-MM-DD') },
    { title: 'Actions', key: 'actions', fixed: 'right', width: 100, align: 'center', render: (_, record) => (
        <Space>
          {hasRole([Role.ADMIN]) && (
            <Tooltip title="Edit User">
              <Button
                icon={<EditOutlined />}
                onClick={() => showFormModal(record)}
                disabled={record.id === currentUser?.id || record.role === Role.ADMIN}
              />
            </Tooltip>
          )}
        </Space>
    )},
  ];
  
  const renderMobileList = () => (
    <List
      loading={loading}
      dataSource={data?.users}
      renderItem={(user) => (
        <List.Item>
          <Card
            style={{ width: '100%' }}
            title={user.name || user.email}
            extra={hasRole([Role.ADMIN]) && user.role !== Role.ADMIN && (
                <Button type="link" onClick={() => showFormModal(user)}>Edit</Button>
            )}
          >
            <Descriptions column={1} size="small" layout="horizontal">
              <Descriptions.Item label="Role"><Tag color={roleColors[user.role as Role] || 'default'}>{user.role}</Tag></Descriptions.Item>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="Telegram ID">{user.telegramChatId || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Joined">{moment(user.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
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
          <Title level={2} style={{ margin: 0 }}>User Management</Title>
        </Col>
        <Col>
          {hasRole([Role.ADMIN]) && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showFormModal()}>
              Create User
            </Button>
          )}
        </Col>
      </Row>

      {screens.md ? (
        <Card><Table columns={desktopColumns} dataSource={data?.users} loading={loading} rowKey="id" scroll={{ x: 'max-content' }} /></Card>
      ) : (
        renderMobileList()
      )}

      {/* A single, reusable modal for both creating and editing */}
      <UserFormModal
        open={isFormModalOpen}
        onClose={handleModalClose}
        userToEdit={editingUser}
      />
    </div>
  );
};

export default UserListPage;
