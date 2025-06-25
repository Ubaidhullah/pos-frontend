import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, Button, message, DatePicker, Select, InputNumber } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import { CREATE_EXPENSE, UPDATE_EXPENSE } from '../../apollo/mutations/expenseMutations';
import { GET_EXPENSE_CATEGORIES, GET_EXPENSES } from '../../apollo/queries/expenseQueries';
import moment, { type Moment } from 'moment';
import {GET_SETTINGS} from '../../apollo/queries/settingsQueries'
import { useAntdNotice } from '../../contexts/AntdNoticeContext';


const { TextArea } = Input;
const { Option } = Select;

interface CategoryInfo { id: string; name: string; }

interface ExpenseFormData {
  description: string;
  amount: number;
  expenseDate: Moment;
  categoryId: string;
  notes?: string;
}

export interface ExpenseToEdit extends ExpenseFormData {
  id: string;
}

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  expenseToEdit?: ExpenseToEdit | null;
  // Pass filters to refetch the correct list view
  currentFilters?: { categoryId?: string; dateRange?: [Moment | null, Moment | null] };
}

interface SettingsData {
    displayCurrency?: string;
    baseCurrency?: string;
}

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ open, onClose, expenseToEdit, currentFilters }) => {
  const [form] = Form.useForm<ExpenseFormData>();

  const { data: categoriesData, loading: categoriesLoading } = useQuery<{ expenseCategories: CategoryInfo[] }>(GET_EXPENSE_CATEGORIES);
  const [createExpense, { loading: createLoading }] = useMutation(CREATE_EXPENSE);
  const [updateExpense, { loading: updateLoading }] = useMutation(UPDATE_EXPENSE);
   const { data: settingsData } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  const { messageApi } = useAntdNotice();

  const currencySymbol = useMemo(() => {
      return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
    }, [settingsData]);

  useEffect(() => {
    if (open) {
      if (expenseToEdit) {
        form.setFieldsValue({
          ...expenseToEdit,
          expenseDate: moment(expenseToEdit.expenseDate),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ expenseDate: moment() }); // Default to today
      }
    }
  }, [open, expenseToEdit, form]);

  const handleFinish = async (values: ExpenseFormData) => {
    const variables = {
      ...values,
      amount: Number(values.amount),
      expenseDate: values.expenseDate.toISOString(),
    };
    
    const mutationOptions = {
      refetchQueries: [{
        query: GET_EXPENSES,
        variables: {
          categoryId: currentFilters?.categoryId,
          startDate: currentFilters?.dateRange?.[0]?.startOf('day').toISOString(),
          endDate: currentFilters?.dateRange?.[1]?.endOf('day').toISOString(),
        }
      }],
    };

    try {
      if (expenseToEdit) {
        await updateExpense({ variables: { id: expenseToEdit.id, updateExpenseInput: variables }, ...mutationOptions });
        messageApi.success('Expense updated successfully!');
      } else {
        await createExpense({ variables: { createExpenseInput: variables }, ...mutationOptions });
        messageApi.success('Expense created successfully!');
      }
      onClose();
    } catch (e: any) {
      messageApi.error(`Operation failed: ${e.message}`);
    }
  };

  const isLoading = createLoading || updateLoading;

  return (
    <Modal
      title={expenseToEdit ? 'Edit Expense' : 'Log New Expense'}
      open={open}
      onCancel={onClose}
      confirmLoading={isLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={form.submit}>
          {expenseToEdit ? 'Save Changes' : 'Log Expense'}
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="description" label="Description" rules={[{ required: true }]}>
          <Input placeholder="e.g., Monthly Office Rent" />
        </Form.Item>
        <Form.Item name="amount" label="Amount" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
          <InputNumber addonBefore={currencySymbol} style={{ width: '100%' }} min={0.01} precision={2} />
        </Form.Item>
        <Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
          <Select loading={categoriesLoading} placeholder="Select a category">
            {categoriesData?.expenseCategories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <TextArea rows={3} placeholder="Optional notes about this expense" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExpenseFormModal;