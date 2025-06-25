import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, message, Popconfirm, Tooltip, DatePicker, Select, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import moment, { type Moment } from 'moment';

import { GET_EXPENSES, GET_EXPENSE_CATEGORIES } from '../../apollo/queries/expenseQueries';
import {GET_SETTINGS} from '../../apollo/queries/settingsQueries'
import { REMOVE_EXPENSE } from '../../apollo/mutations/expenseMutations';
import ExpenseFormModal, { type ExpenseToEdit } from './ExpenseFormModal';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface ExpenseData extends ExpenseToEdit {
    category: { name: string; };
    user?: { name?: string; };
}

interface SettingsData {
    displayCurrency?: string;
    baseCurrency?: string;
}

const ExpenseList: React.FC = () => {
  const [filters, setFilters] = useState<{
    categoryId?: string;
    dateRange?: [Moment | null, Moment | null];
  }>({
    dateRange: [moment().startOf('month'), moment().endOf('month')]
  });

  // 1. Fetch settings data along with other queries
  const { data: settingsData } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  const { data, loading, error, refetch } = useQuery<{ expenses: ExpenseData[] }>(GET_EXPENSES, {
    variables: {
      categoryId: filters.categoryId,
      startDate: filters.dateRange?.[0]?.startOf('day').toISOString(),
      endDate: filters.dateRange?.[1]?.endOf('day').toISOString(),
    },
    notifyOnNetworkStatusChange: true,
  });
  
  const { data: categoriesData, loading: categoriesLoading } = useQuery(GET_EXPENSE_CATEGORIES);
  const [removeExpense, { loading: removeLoading }] = useMutation(REMOVE_EXPENSE);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseToEdit | null>(null);
  
  // 2. Determine the currency symbol to use
  const currencySymbol = useMemo(() => {
    return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
  }, [settingsData]);


  const handleFilterChange = (filterName: string, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleRemove = async (id: string) => {
    try {
      await removeExpense({
        variables: { id },
        refetchQueries: [{ query: GET_EXPENSES, variables: { 
            categoryId: filters.categoryId,
            startDate: filters.dateRange?.[0]?.startOf('day').toISOString(),
            endDate: filters.dateRange?.[1]?.endOf('day').toISOString(),
         } }],
      });
      message.success('Expense removed successfully.');
    } catch (e: any) {
      message.error(`Failed to remove expense: ${e.message}`);
    }
  };

  const totalExpenses = data?.expenses.reduce((sum, expense) => sum + expense.amount, 0) || 0;

  const columns = [
    { title: 'Date', dataIndex: 'expenseDate', key: 'date', render: (date: string) => moment(date).format('YYYY-MM-DD'), sorter: (a: ExpenseData, b: ExpenseData) => moment(a.expenseDate).unix() - moment(b.expenseDate).unix() },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Category', dataIndex: ['category', 'name'], key: 'category' },
    // 3. Use the dynamic currency symbol in the 'Amount' column
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amount: number) => `${currencySymbol}${amount.toFixed(2)}`, align: 'right' as 'right', sorter: (a: ExpenseData, b: ExpenseData) => a.amount - b.amount },
    { title: 'Notes', dataIndex: 'notes', key: 'notes' },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: ExpenseToEdit) => (
        <Space>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} onClick={() => { setEditingExpense(record); setIsModalOpen(true); }} />
          </Tooltip>
          <Popconfirm
            title="Delete this expense?"
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

  if (error) message.error('Error loading expenses.');

  return (
    <div>
        <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                    <Select placeholder="Filter by Category" style={{ width: '100%' }} onChange={(val) => handleFilterChange('categoryId', val)} loading={categoriesLoading} allowClear>
                        {categoriesData?.expenseCategories.map((cat: { id: any; name: string }) => <Option key={cat.id} value={cat.id}>{cat.name}</Option>)}
                    </Select>
                </Col>
                <Col xs={24} sm={12} md={10}>
                    <RangePicker
                        style={{ width: '100%' }}
                        onChange={(dates) => handleFilterChange('dateRange', dates)}
                        value={filters.dateRange as any}
                        picker="date"
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Space>
                        <Button type="primary" icon={<FilterOutlined />} onClick={() => refetch()} loading={loading}>Apply Filters</Button>
                        <Button icon={<ReloadOutlined />} onClick={() => { setFilters({dateRange: [moment().startOf('month'), moment().endOf('month')]}); refetch({ categoryId: undefined, startDate: moment().startOf('month').toISOString(), endDate: moment().endOf('month').toISOString() }); }}>Reset</Button>
                    </Space>
                </Col>
            </Row>
        </Card>

        {/* 4. Use the dynamic currency symbol in the Statistic component */}
        <Card style={{ marginBottom: 16 }}>
            <Statistic title="Total Expenses (Filtered Period)" value={totalExpenses} precision={2} prefix={currencySymbol} loading={loading} />
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}>
            Log New Expense
            </Button>
        </div>
        <Table
            columns={columns}
            dataSource={data?.expenses}
            loading={loading}
            rowKey="id"
        />
        <ExpenseFormModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            expenseToEdit={editingExpense}
            currentFilters={filters}
        />
    </div>
  );
};

export default ExpenseList;
