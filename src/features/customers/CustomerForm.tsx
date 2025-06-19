import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useMutation } from '@apollo/client';
import { CREATE_CUSTOMER, UPDATE_CUSTOMER } from '../../apollo/mutations/customerMutations';
import { GET_CUSTOMERS } from '../../apollo/queries/customerQueries';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';


const { TextArea } = Input;

interface CustomerDataForForm {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}
interface CustomerToEdit extends CustomerDataForForm {
  id: string;
}
interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  customerToEdit?: CustomerToEdit | null;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ open, onClose, customerToEdit }) => {
  const [form] = Form.useForm<CustomerDataForForm>();

  const [createCustomer, { loading: createLoading }] = useMutation(CREATE_CUSTOMER);
  const [updateCustomer, { loading: updateLoading }] = useMutation(UPDATE_CUSTOMER);
  const { messageApi } = useAntdNotice();
  

  useEffect(() => {
    if (open) {
      if (customerToEdit) {
        form.setFieldsValue(customerToEdit);
      } else {
        form.resetFields();
      }
    }
  }, [open, customerToEdit, form]);

  const handleFinish = async (values: CustomerDataForForm) => {
    try {
      if (customerToEdit && customerToEdit.id) {
        await updateCustomer({
          variables: { id: customerToEdit.id, updateCustomerInput: values },
          refetchQueries: [{ query: GET_CUSTOMERS, variables: { searchTerm: '' } }], // Refetch list
        });
        messageApi.success('Customer updated successfully!');
      } else {
        await createCustomer({
          variables: { createCustomerInput: values },
          refetchQueries: [{ query: GET_CUSTOMERS, variables: { searchTerm: '' } }], // Refetch list
        });
        messageApi.success('Customer created successfully!');
      }
      form.resetFields();
      onClose();
    } catch (e: any) {
      messageApi.error(`Operation failed: ${e.message}`);
    }
  };

  const isLoading = createLoading || updateLoading;

  return (
    <Modal
      title={customerToEdit ? 'Edit Customer' : 'Add New Customer'}
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={[
        <Button key="back" onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={() => form.submit()}>
          {customerToEdit ? 'Save Changes' : 'Create Customer'}
        </Button>,
      ]}
      destroyOnClose
    >
      {open && (
        <Form form={form} layout="vertical" name="customerForm" onFinish={handleFinish}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please input the customer name!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'The input is not valid E-mail!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone Number">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default CustomerForm;