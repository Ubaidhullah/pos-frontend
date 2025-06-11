import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, message, Popconfirm, Tooltip, Typography, Switch, Tag, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { GET_TAXES } from '../../apollo/queries/taxQueries';
import { REMOVE_TAX, UPDATE_TAX } from '../../apollo/mutations/taxMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import TaxFormModal, { type TaxToEdit } from './TaxFormModal';

const { Title } = Typography;

const TaxListPage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<{ taxes: TaxToEdit[] }>(GET_TAXES);
  const [removeTax, { loading: removeLoading }] = useMutation(REMOVE_TAX);
  const [updateTax] = useMutation(UPDATE_TAX); // For inline switch toggles
  const { hasRole } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxToEdit | null>(null);

  const handleRemove = async (id: string) => {
    try {
      await removeTax({
        variables: { id },
        refetchQueries: [{ query: GET_TAXES }],
      });
      message.success('Tax rate removed successfully.');
    } catch (e: any) {
      message.error(`Failed to remove tax rate: ${e.message}`);
    }
  };

  const handleToggle = async (tax: TaxToEdit, field: 'isEnabled' | 'isDefault') => {
    try {
      await updateTax({
        variables: {
          id: tax.id,
          updateTaxInput: { [field]: !tax[field] }, // Toggle the boolean value
        },
        refetchQueries: [{ query: GET_TAXES }], // Refetch to get updated list (especially for 'isDefault')
      });
      message.success(`Tax '${tax.name}' has been updated.`);
    } catch (e: any) {
      message.error(`Failed to update tax: ${e.message}`);
    }
  };


  if (error) message.error('Error loading tax rates.');
  if (!hasRole([Role.ADMIN])) return <Alert message="Access Denied" type="error" />;

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: TaxToEdit, b: TaxToEdit) => a.name.localeCompare(b.name) },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', render: (rate: number) => `${rate}%`, sorter: (a: TaxToEdit, b: TaxToEdit) => a.rate - b.rate },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Enabled', dataIndex: 'isEnabled', key: 'isEnabled', render: (isEnabled: boolean, record: TaxToEdit) => <Switch checked={isEnabled} onChange={() => handleToggle(record, 'isEnabled')} /> },
    { title: 'Default', dataIndex: 'isDefault', key: 'isDefault', render: (isDefault: boolean, record: TaxToEdit) => <Switch checked={isDefault} onChange={() => handleToggle(record, 'isDefault')} /> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TaxToEdit) => (
        <Space>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} onClick={() => { setEditingTax(record); setIsModalOpen(true); }} />
          </Tooltip>
          <Popconfirm
            title={`Delete "${record.name}"?`}
            description="This cannot be undone. You can only delete taxes that are not assigned to any products."
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Tax Rate Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTax(null); setIsModalOpen(true); }}>
          Add Tax Rate
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={data?.taxes}
        loading={loading}
        rowKey="id"
      />
      <TaxFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        taxToEdit={editingTax}
      />
    </div>
  );
};

export default TaxListPage;