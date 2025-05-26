import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, Modal, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { GET_CATEGORIES } from '../../apollo/queries/categoryQueries';
import { DELETE_CATEGORY } from '../../apollo/mutations/categoryMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import CategoryForm from './CategoryForm';

interface Category {
  id: string;
  name: string;
}

const CategoryListPage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<{ categories: Category[] }>(GET_CATEGORIES);
  const [deleteCategoryMutation, { loading: deleteLoading }] = useMutation(DELETE_CATEGORY);
  const { hasRole } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const showAddModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const showEditModal = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    refetch(); // Refetch categories after add/edit
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategoryMutation({
        variables: { id: categoryId },
        refetchQueries: [{ query: GET_CATEGORIES }],
      });
      message.success('Category deleted successfully');
    } catch (e: any) {
      message.error(`Error deleting category: ${e.message}`);
    }
  };

  if (error) {
    message.error(`Error loading categories: ${error.message}`);
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: Category, b: Category) => a.name.localeCompare(b.name) },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Category) => (
        <Space size="middle">
          {hasRole([Role.ADMIN, Role.MANAGER]) && (
            <Tooltip title="Edit Category">
              <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
            </Tooltip>
          )}
          {hasRole([Role.ADMIN]) && (
            <Popconfirm
              title="Delete the category"
              description="Are you sure? Deleting a category might affect products linked to it."
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ loading: deleteLoading }}
            >
               <Tooltip title="Delete Category">
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
        <h2>Category Management</h2>
        {hasRole([Role.ADMIN, Role.MANAGER]) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            Add Category
          </Button>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={data?.categories}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
      <CategoryForm
        open={isModalOpen}
        onClose={handleModalClose}
        categoryToEdit={editingCategory}
      />
    </div>
  );
};

export default CategoryListPage;