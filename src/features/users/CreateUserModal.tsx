import React from 'react';
import { Modal, Form, Input, Button, Select } from 'antd';
import { useMutation } from '@apollo/client';
import { UserOutlined, MailOutlined, LockOutlined, IdcardOutlined } from '@ant-design/icons';
import { CREATE_USER } from '../../apollo/mutations/userMutations';
import { GET_USERS_FOR_FILTER } from '../../apollo/queries/auditLogQueries'; // To refetch the user list
import { Role } from '../../common/enums/role.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { Option } = Select;

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const { messageApi } = useAntdNotice();
  
  const [createUser, { loading }] = useMutation(CREATE_USER, {
    onCompleted: (data) => {
      messageApi.success(`User '${data.createUser.name}' created successfully.`);
      onClose(); // This will trigger a refetch on the list page
    },
    onError: (error) => {
      messageApi.error(`Failed to create user: ${error.message}`);
    },
  });

  const onFinish = (values: any) => {
    createUser({
      variables: {
        createUserInput: {
          name: values.name,
          username: values.username,
          email: values.email,
          password: values.password,
          role: values.role,
        },
      },
    });
  };

  return (
    <Modal
      title="Create New User"
      open={open}
      onCancel={onClose}
      confirmLoading={loading}
      footer={[
        <Button key="back" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>Create User</Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input prefix={<UserOutlined />} /></Form.Item>
        <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input prefix={<UserOutlined />} /></Form.Item>
        <Form.Item name="email" label="Email Address" rules={[{ required: true }, { type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8, message: 'Password must be at least 8 characters' }]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
        <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) { return Promise.resolve(); } return Promise.reject(new Error('The two passwords do not match!')); } })]}>
            <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select placeholder="Assign a role">
            {Object.values(Role).map(role => (
              <Option key={role} value={role}>{role}</Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateUserModal;
