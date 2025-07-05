import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Select, message } from 'antd';
import { useMutation } from '@apollo/client';
import { UserOutlined, MailOutlined, LockOutlined, MessageOutlined } from '@ant-design/icons';
import { CREATE_USER, UPDATE_USER } from '../../apollo/mutations/userMutations';
import { GET_USERS } from '../../apollo/queries/userQueries';
import { Role } from '../../common/enums/role.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { Option } = Select;

export interface UserToEdit {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  telegramChatId?: string;
}

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  userToEdit?: UserToEdit | null;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ open, onClose, userToEdit }) => {
  const [form] = Form.useForm();
  const { messageApi } = useAntdNotice();
  const isEditMode = !!userToEdit;

  const [createUser, { loading: createLoading }] = useMutation(CREATE_USER);
  const [updateUser, { loading: updateLoading }] = useMutation(UPDATE_USER);

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        form.setFieldsValue(userToEdit);
      } else {
        form.resetFields();
      }
    }
  }, [open, userToEdit, form]);

  const onFinish = (values: any) => {
    // --- FIX IS HERE ---
    // We destructure the values to separate the fields the backend needs
    // from the 'confirmPassword' field which is only for frontend validation.
    const { confirmPassword, ...submissionData } = values;

    const mutationOptions = {
        refetchQueries: [{ query: GET_USERS }],
        onCompleted: () => {
            messageApi.success(`User ${isEditMode ? 'updated' : 'created'} successfully.`);
            onClose();
        },
        onError: (error: any) => {
            messageApi.error(`Operation failed: ${error.message}`);
        }
    };

    if (isEditMode) {
      // For editing, we don't send the password fields at all.
      const { password, ...updateData } = submissionData;
      updateUser({ 
          variables: { id: userToEdit!.id, updateUserInput: updateData }, 
          ...mutationOptions 
      });
    } else {
      createUser({ 
          variables: { createUserInput: submissionData }, // Send the cleaned data
          ...mutationOptions 
      });
    }
  };

  const isLoading = createLoading || updateLoading;

  return (
    <Modal
      title={isEditMode ? 'Edit User' : 'Create New User'}
      open={open}
      onCancel={onClose}
      confirmLoading={isLoading}
      footer={[
        <Button key="back" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={() => form.submit()}>
          {isEditMode ? 'Save Changes' : 'Create User'}
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input prefix={<UserOutlined />} /></Form.Item>
        <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input prefix={<UserOutlined />} /></Form.Item>
        <Form.Item name="email" label="Email Address" rules={[{ required: true }, { type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item>
        
        {!isEditMode && (
            <>
                <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8, message: 'Password must be at least 8 characters' }]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
                <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) { return Promise.resolve(); } return Promise.reject(new Error('The two passwords do not match!')); } })]}>
                    <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
            </>
        )}
        
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select placeholder="Assign a role">
            {Object.values(Role).filter(role => role !== Role.ADMIN).map(role => (
              <Option key={role} value={role}>{role}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="telegramChatId" label="Telegram Chat ID" tooltip="Optional. Allows the user to receive direct notifications from the bot.">
          <Input placeholder="e.g., 123456789" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserFormModal;
