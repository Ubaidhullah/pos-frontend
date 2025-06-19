import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message, InputNumber, Switch, Space } from 'antd';
import { useMutation } from '@apollo/client';
import { CREATE_TAX, UPDATE_TAX } from '../../apollo/mutations/taxMutations';
import { GET_TAXES } from '../../apollo/queries/taxQueries';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';


const { TextArea } = Input;

interface TaxFormData {
  name: string;
  rate: number;
  description?: string;
  isEnabled: boolean;
  // isDefault: boolean;
}

export interface TaxToEdit extends TaxFormData {
  id: string;
}

interface TaxFormModalProps {
  open: boolean;
  onClose: () => void;
  taxToEdit?: TaxToEdit | null;
}

const TaxFormModal: React.FC<TaxFormModalProps> = ({ open, onClose, taxToEdit }) => {
  const [form] = Form.useForm<TaxFormData>();

  const [createTax, { loading: createLoading }] = useMutation(CREATE_TAX);
  const [updateTax, { loading: updateLoading }] = useMutation(UPDATE_TAX);
  const { messageApi } = useAntdNotice();
  

  useEffect(() => {
    if (open) {
      if (taxToEdit) {
        form.setFieldsValue(taxToEdit);
      } else {
        // Set defaults for a new tax rate
        form.resetFields();
        form.setFieldsValue({ isEnabled: true});
      }
    }
  }, [open, taxToEdit, form]);

  const handleFinish = async (values: TaxFormData) => {
    // Ensure rate is a number
    const processedValues = {
        ...values,
        rate: Number(values.rate) || 0,
    };

    try {
      const mutationOptions = {
        refetchQueries: [{ query: GET_TAXES }],
      };

      if (taxToEdit) {
        await updateTax({
          variables: { id: taxToEdit.id, updateTaxInput: processedValues },
          ...mutationOptions,
        });
        messageApi.success('Tax rate updated successfully!');
      } else {
        await createTax({
          variables: { createTaxInput: processedValues },
          ...mutationOptions,
        });
        messageApi.success('Tax rate created successfully!');
      }
      onClose();
    } catch (e: any) {
      messageApi.error(`Operation failed: ${e.message}`);
    }
  };

  const isLoading = createLoading || updateLoading;

  return (
    <Modal
      title={taxToEdit ? 'Edit Tax Rate' : 'Add New Tax Rate'}
      open={open}
      onCancel={onClose}
      confirmLoading={isLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={form.submit}>
          {taxToEdit ? 'Save Changes' : 'Create Tax Rate'}
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ isEnabled: true, isDefault: false }}>
        <Form.Item name="name" label="Tax Name" rules={[{ required: true, message: 'Please input the tax name!' }]}>
          <Input placeholder="e.g., GST, VAT" />
        </Form.Item>
        <Form.Item name="rate" label="Rate (%)" rules={[{ required: true, message: 'Please input the tax rate!' }, { type: 'number', min: 0, message: 'Rate cannot be negative.' }]}>
          <InputNumber addonAfter="%" style={{ width: '100%' }} min={0} placeholder="e.g., 5 for 5%" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <TextArea rows={2} placeholder="Optional description for this tax rate" />
        </Form.Item>
        <Space>
            <Form.Item name="isEnabled" label="Enabled" valuePropName="checked">
                <Switch />
            </Form.Item>
            {/* <Form.Item name="isDefault" label="Set as Default" valuePropName="checked" tooltip="If checked, this tax will be the default for new products and any other defaults will be unset.">
                <Switch />
            </Form.Item> */}
        </Space>
      </Form>
    </Modal>
  );
};

export default TaxFormModal;