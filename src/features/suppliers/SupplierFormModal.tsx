import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message, Grid } from 'antd';
import { useMutation } from '@apollo/client';
import { CREATE_SUPPLIER, UPDATE_SUPPLIER } from '../../apollo/mutations/supplierMutations';
import { GET_SUPPLIERS } from '../../apollo/queries/supplierQueries';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { TextArea } = Input;
const { useBreakpoint } = Grid; // Import the useBreakpoint hook

interface SupplierFormData {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface SupplierToEdit extends SupplierFormData {
  id: string;
}

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  supplierToEdit?: SupplierToEdit | null;
  onSuccess?: (newSupplierId: string) => void;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ open, onClose, supplierToEdit, onSuccess }) => {
  const [form] = Form.useForm<SupplierFormData>();
  const { messageApi } = useAntdNotice();
  const screens = useBreakpoint(); // Hook to get screen size info

  const [createSupplier, { loading: createLoading }] = useMutation(CREATE_SUPPLIER, {
    onCompleted: (data) => {
        if (data?.createSupplier && onSuccess) {
            onSuccess(data.createSupplier.id);
        }
    }
  });
  const [updateSupplier, { loading: updateLoading }] = useMutation(UPDATE_SUPPLIER);

  useEffect(() => {
    if (open) {
      if (supplierToEdit) {
        form.setFieldsValue(supplierToEdit);
      } else {
        form.resetFields();
      }
    }
  }, [open, supplierToEdit, form]);

  const handleFinish = async (values: SupplierFormData) => {
    try {
      if (supplierToEdit && supplierToEdit.id) {
        await updateSupplier({
          variables: { id: supplierToEdit.id, updateSupplierInput: values },
          refetchQueries: [{ query: GET_SUPPLIERS }],
        });
        messageApi.success('Supplier updated successfully!');
      } else {
        await createSupplier({
          variables: { createSupplierInput: values },
          // No need to refetch here if the `onSuccess` callback handles it
        });
        messageApi.success('Supplier created successfully!');
      }
      onClose(); 
    } catch (e: any) {
      messageApi.error(`Operation failed: ${e.message}`);
    }
  };

  const isLoading = createLoading || updateLoading;

  return (
    <Modal
      title={supplierToEdit ? 'Edit Supplier' : 'Add New Supplier'}
      open={open}
      onCancel={onClose}
      width={screens.md ? 720 : '95vw'} // Responsive modal width
      confirmLoading={isLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={() => form.submit()}>
          {supplierToEdit ? 'Save Changes' : 'Create Supplier'}
        </Button>,
      ]}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical" name="supplierForm" onFinish={handleFinish}>
        <Form.Item name="name" label="Supplier Name" rules={[{ required: true, message: 'Please input the supplier name!' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="contactName" label="Contact Name">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email format!' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Phone Number">
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Address">
          <TextArea rows={2} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SupplierFormModal;
