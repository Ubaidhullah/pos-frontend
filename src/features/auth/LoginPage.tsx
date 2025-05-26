import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gql, useMutation } from '@apollo/client';
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';

const { Title, Text } = Typography;

const LOGIN_MUTATION = gql`
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      accessToken
      user {
        id
        email
        name
        role
      }
    }
  }
`;

const LoginPage: React.FC = () => {
  const { login: contextLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [form] = Form.useForm();

  const [loginUser, { loading, error }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      const userRole = data.login.user.role as Role;
      contextLogin(data.login.accessToken, { ...data.login.user, role: userRole });
      navigate(from, { replace: true });
    },
  });

  const onFinish = (values: any) => {
    loginUser({ variables: { loginInput: { email: values.email, password: values.password } } });
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to right, #f9f9f9, #e6f7ff)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          padding: '40px 30px',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
        }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 0 }}>
            POS System Login
          </Title>
          <Text type="secondary">Please sign in to continue</Text>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Spin size="large" />
          </div>
        )}

        {error && (
          <Alert
            message={`Login Failed: ${error.message}`}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form form={form} name="login" onFinish={onFinish} size="large" layout="vertical">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input your Email!' },
              { type: 'email', message: 'Invalid email format' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="example@email.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Your secure password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
