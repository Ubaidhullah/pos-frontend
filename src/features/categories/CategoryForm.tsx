import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message, Spin } from 'antd';
import { useMutation } from '@apollo/client';
import { CREATE_CATEGORY, UPDATE_CATEGORY } from '../../apollo/mutations/categoryMutations';
import { GET_CATEGORIES } from '../../apollo/queries/categoryQueries';

interface CategoryDataForForm {
  name: string;
}
interface CategoryToEdit {
  id: string;
  name: string;
}
interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryToEdit | null;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ open, onClose, categoryToEdit }) => {
  const [form] = Form.useForm<CategoryDataForForm>();

  const [createCategory, { loading: createLoading }] = useMutation(CREATE_CATEGORY);
  const [updateCategory, { loading: updateLoading }] = useMutation(UPDATE_CATEGORY);

  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        form.setFieldsValue({ name: categoryToEdit.name });
      } else {
        form.resetFields();
      }
    }
  }, [open, categoryToEdit, form]);

  const handleFinish = async (values: CategoryDataForForm) => {
    try {
      if (categoryToEdit && categoryToEdit.id) {
        await updateCategory({
          variables: { id: categoryToEdit.id, updateCategoryInput: values },
          refetchQueries: [{ query: GET_CATEGORIES }],
        });
        message.success('Category updated successfully!');
      } else {
        await createCategory({
          variables: { createCategoryInput: values },
          refetchQueries: [{ query: GET_CATEGORIES }],
        });
        message.success('Category created successfully!');
      }
      form.resetFields();
      onClose();
    } catch (e: any) {
      message.error(`Operation failed: ${e.message}`);
    }
  };

  const isLoading = createLoading || updateLoading;

  return (
    <Modal
      title={categoryToEdit ? 'Edit Category' : 'Add New Category'}
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={[
        <Button key="back" onClick={() => { form.resetFields(); onClose(); }}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={() => form.submit()}>
          {categoryToEdit ? 'Save Changes' : 'Create Category'}
        </Button>,
      ]}
      destroyOnClose
    >
      {open && ( // Render form only when modal is open for proper state handling
        <Form form={form} layout="vertical" name="categoryForm" onFinish={handleFinish}>
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please input the category name!' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default CategoryForm;