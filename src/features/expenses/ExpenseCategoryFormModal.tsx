import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useMutation } from '@apollo/client';
import { CREATE_EXPENSE_CATEGORY, UPDATE_EXPENSE_CATEGORY } from '../../apollo/mutations/expenseMutations';
import { GET_EXPENSE_CATEGORIES } from '../../apollo/queries/expenseQueries';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';


const { TextArea } = Input;

interface CategoryFormData {
  name: string;
  description?: string;
}

export interface CategoryToEdit extends CategoryFormData {
  id: string;
}

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryToEdit | null;
}

const ExpenseCategoryFormModal: React.FC<CategoryFormModalProps> = ({ open, onClose, categoryToEdit }) => {
  const [form] = Form.useForm<CategoryFormData>();

  const [createCategory, { loading: createLoading }] = useMutation(CREATE_EXPENSE_CATEGORY);
  const [updateCategory, { loading: updateLoading }] = useMutation(UPDATE_EXPENSE_CATEGORY);
  const { messageApi } = useAntdNotice();
  

  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        form.setFieldsValue(categoryToEdit);
      } else {
        form.resetFields();
      }
    }
  }, [open, categoryToEdit, form]);

  const handleFinish = async (values: CategoryFormData) => {
    try {
      const mutationOptions = {
        refetchQueries: [{ query: GET_EXPENSE_CATEGORIES }],
      };

      if (categoryToEdit) {
        await updateCategory({
          variables: { id: categoryToEdit.id, updateExpenseCategoryInput: values },
          ...mutationOptions,
        });
        messageApi.success('Category updated successfully!');
      } else {
        await createCategory({
          variables: { createExpenseCategoryInput: values },
          ...mutationOptions,
        });
        messageApi.success('Category created successfully!');
      }
      onClose();
    } catch (e: any) {
      messageApi.error(`Operation failed: ${e.message}`);
    }
  };

  const isLoading = createLoading || updateLoading;

  return (
    <Modal
      title={categoryToEdit ? 'Edit Expense Category' : 'Add New Expense Category'}
      open={open}
      onCancel={onClose}
      confirmLoading={isLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={form.submit}>
          {categoryToEdit ? 'Save Changes' : 'Create Category'}
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExpenseCategoryFormModal;