import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { GET_EXPENSE_CATEGORIES } from '../../apollo/queries/expenseQueries';
import { REMOVE_EXPENSE_CATEGORY } from '../../apollo/mutations/expenseMutations';
import ExpenseCategoryFormModal, { type CategoryToEdit } from './ExpenseCategoryFormModal';

const ExpenseCategoryManagement: React.FC = () => {
  const { data, loading, error } = useQuery<{ expenseCategories: CategoryToEdit[] }>(GET_EXPENSE_CATEGORIES);
  const [removeCategory, { loading: removeLoading }] = useMutation(REMOVE_EXPENSE_CATEGORY);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryToEdit | null>(null);

  const handleRemove = async (id: string) => {
    try {
      await removeCategory({
        variables: { id },
        refetchQueries: [{ query: GET_EXPENSE_CATEGORIES }],
      });
      message.success('Category removed successfully.');
    } catch (e: any) {
      message.error(`Failed to remove category: ${e.message}`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: CategoryToEdit) => (
        <Space>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} onClick={() => { setEditingCategory(record); setIsModalOpen(true); }} />
          </Tooltip>
          <Popconfirm
            title={`Delete "${record.name}"?`}
            description="Are you sure? This cannot be undone."
            onConfirm={() => handleRemove(record.id)}
            okText="Yes, Delete"
            okButtonProps={{ loading: removeLoading }}
          >
            <Tooltip title="Delete">
              <Button icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (error) {
    message.error('Error loading expense categories.');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCategory(null); setIsModalOpen(true); }}>
          Add Category
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={data?.expenseCategories}
        loading={loading}
        rowKey="id"
      />
      <ExpenseCategoryFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoryToEdit={editingCategory}
      />
    </div>
  );
};

export default ExpenseCategoryManagement;