import React from 'react';
import { useMutation } from '@apollo/client';
import { Form, Input, Button, Card, Typography, Alert, Steps, Divider } from 'antd';
import { ShopOutlined, UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { Role } from '../../common/enums/role.enum';
import { CREATE_COMPANY_AND_ADMIN } from '../../apollo/mutations/companyMutations';

const { Title } = Typography;

const RegisterCompanyPage: React.FC = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { login: contextLogin } = useAuth();
    const { messageApi } = useAntdNotice();

    const [register, { loading, error }] = useMutation(CREATE_COMPANY_AND_ADMIN, {
        onCompleted: (data) => {
            const { accessToken, user } = data.createCompanyAndAdmin;
            messageApi.success(`Welcome, ${user.name}! Your company has been created.`);
            contextLogin(accessToken, {
                ...user,
                role: user.role as Role,
            });
            navigate('/'); // Redirect to dashboard on successful login
        },
        onError: (err) => {
            // The form's error display is usually sufficient
            console.error("Registration failed:", err);
        }
    });

    const onFinish = (values: any) => {
        register({
            variables: {
                createCompanyAndAdminInput: {
                    companyName: values.companyName,
                    adminName: values.adminName,
                    adminUsername: values.adminUsername,
                    adminEmail: values.adminEmail,
                    adminPassword: values.adminPassword,
                }
            }
        });
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
            <Card style={{ width: 450 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2}>Create Your Company Account</Title>
                </div>
                
                {error && <Alert message={`Registration Failed: ${error.message}`} type="error" showIcon style={{ marginBottom: 24 }} />}

                <Form form={form} layout="vertical" onFinish={onFinish} size="large">
                    <Title level={4}>Company Details</Title>
                    <Form.Item name="companyName" label="Company Name" rules={[{ required: true, message: 'Please enter your company name' }]}>
                        <Input prefix={<ShopOutlined />} placeholder="e.g., Swell Pets" />
                    </Form.Item>

                    <Divider>Your Admin Account</Divider>
                    
                    <Form.Item name="adminName" label="Your Full Name" rules={[{ required: true }]}>
                        <Input prefix={<UserOutlined />} placeholder="e.g., Alee Samaah" />
                    </Form.Item>
                    <Form.Item name="adminUsername" label="Username" rules={[{ required: true }]}>
                        <Input prefix={<UserOutlined />} placeholder="e.g., swell-pets-02" />
                    </Form.Item>
                    <Form.Item name="adminEmail" label="Email Address" rules={[{ required: true }, { type: 'email' }]}>
                        <Input prefix={<MailOutlined />} placeholder="e.g., alee.samaah@gmail.com" />
                    </Form.Item>
                    <Form.Item name="adminPassword" label="Password" rules={[{ required: true }, { min: 8, message: 'Password must be at least 8 characters' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                    </Form.Item>
                    <Form.Item
                        name="confirmPassword"
                        label="Confirm Password"
                        dependencies={['adminPassword']}
                        rules={[
                            { required: true, message: 'Please confirm your password!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('adminPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('The two passwords do not match!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" />
                    </Form.Item>
                    
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
                            Create Account & Login
                        </Button>
                    </Form.Item>
                    <div style={{ textAlign: 'center' }}>
                        <Link to="/login">Already have an account? Login</Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default RegisterCompanyPage;