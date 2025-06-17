import React, { useState, useEffect } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { Form, Input, Button, Card, Typography, Alert, Spin, Select, Steps, Space } from 'antd';
import { MailOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { Role } from '../../common/enums/role.enum';
import { FIND_COMPANIES_BY_EMAIL } from '../../apollo/queries/companyQueries';
import { LOGIN_MUTATION } from '../../apollo/mutations/authMutations'; // Assuming you have this defined

const { Title } = Typography;
const { Option } = Select;

interface CompanyInfo {
    id: string;
    name: string;
}

const LoginPage: React.FC = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const location = useLocation();
    const { login: contextLogin, isAuthenticated } = useAuth();
    const { messageApi } = useAntdNotice();
    
    const [step, setStep] = useState(0); // 0 for email input, 1 for company/password input
    const [userEmail, setUserEmail] = useState('');
    const [foundCompanies, setFoundCompanies] = useState<CompanyInfo[]>([]);

    const [findCompanies, { loading: findingCompanies, error: findError }] = useLazyQuery(FIND_COMPANIES_BY_EMAIL, {
        onCompleted: (data) => {
            if (data?.companiesByEmail && data.companiesByEmail.length > 0) {
                setFoundCompanies(data.companiesByEmail);
                if (data.companiesByEmail.length === 1) {
                    // If only one company, pre-select it
                    form.setFieldsValue({ companyId: data.companiesByEmail[0].id });
                }
                setStep(1); // Move to the next step
            } else {
                messageApi.error("No account found for this email address.");
            }
        },
        onError: (err) => messageApi.error(`Error finding companies: ${err.message}`)
    });

    const [loginUser, { loading: loginLoading, error: loginError }] = useMutation(LOGIN_MUTATION, {
        onCompleted: (data) => {
            const user = data.login.user;
            contextLogin(data.login.accessToken, {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role as Role,
                companyId: user.companyId,
            });
            navigate(location.state?.from?.pathname || '/', { replace: true });
        },
    });

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleEmailSubmit = ({ email }: { email: string }) => {
        setUserEmail(email);
        findCompanies({ variables: { email } });
    };

    const handleLoginSubmit = (values: any) => {
        loginUser({
            variables: {
                loginInput: {
                    email: userEmail,
                    password: values.password,
                    companyId: values.companyId,
                },
            },
        });
    };

    const resetFlow = () => {
        setStep(0);
        setUserEmail('');
        setFoundCompanies([]);
        form.resetFields();
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
            <Card style={{ width: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2}>POS System Login</Title>
                    <Steps current={step} items={[{ title: 'Email' }, { title: 'Login' }]} />
                </div>

                {step === 0 && (
                    <Form onFinish={handleEmailSubmit} size="large">
                        <Form.Item name="email" rules={[{ required: true, message: 'Please input your Email!' }, { type: 'email' }]}>
                            <Input prefix={<MailOutlined />} placeholder="Enter your email address" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={findingCompanies} style={{ width: '100%' }}>
                                Find My Account
                            </Button>
                        </Form.Item>
                    </Form>
                )}

                {step === 1 && (
                    <Form form={form} onFinish={handleLoginSubmit} size="large">
                        <Alert message={<>Logging in as: <strong>{userEmail}</strong></>} type="info" style={{marginBottom: 16}}/>
                        <Form.Item name="companyId" rules={[{ required: true, message: 'Please select your company!' }]}>
                            <Select placeholder="Select your company" prefix={<ShopOutlined />}>
                                {foundCompanies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: 'Please input your Password!' }]}>
                            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                        </Form.Item>
                        {loginError && <Alert message={loginError.message} type="error" showIcon style={{marginBottom: 16}}/>}
                        <Form.Item>
                            <Space style={{width: '100%'}}>
                                <Button onClick={resetFlow} disabled={loginLoading}>Back</Button>
                                <Button type="primary" htmlType="submit" loading={loginLoading} style={{ flexGrow: 1 }}>
                                    Login
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                )}
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Link to="/register-company">Don't have an account? Register your company</Link>
                </div>
            </Card>
        </div>
    );
};

export default LoginPage;