import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Typography, Tag, Tooltip, DatePicker, Select, Button, Space, Card, Row, Col, Alert } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { GET_AUDIT_LOGS, GET_USERS_FOR_FILTER } from '../../apollo/queries/auditLogQueries';
import { AuditLogAction } from './enums/audit-log-action.enum';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface UserFilterData {
    id: string;
    name?: string;
    email: string;
}

interface AuditLogData {
    id: string;
    action: AuditLogAction;
    entity?: string;
    entityId?: string;
    userEmail: string;
    details?: any;
    createdAt: string;
    user?: {
        name?: string;
    };
}

const AuditLogPage: React.FC = () => {
    const { hasRole } = useAuth();
    const [filters, setFilters] = useState<{
        userId?: string;
        action?: AuditLogAction;
        dateRange?: [Dayjs | null, Dayjs | null];
    }>({});

    const { data, loading, error, refetch } = useQuery<{ auditLogs: AuditLogData[] }>(GET_AUDIT_LOGS, {
        variables: {
            userId: filters.userId,
            action: filters.action,
            startDate: filters.dateRange?.[0]?.startOf('day').toISOString(),
            endDate: filters.dateRange?.[1]?.endOf('day').toISOString(),
        },
        notifyOnNetworkStatusChange: true,
    });

    const { data: usersData, loading: usersLoading } = useQuery<{ users: UserFilterData[] }>(GET_USERS_FOR_FILTER);

    const handleFilterChange = (filterName: string, value: any) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const resetFilters = () => {
        setFilters({});
        refetch({ userId: undefined, action: undefined, startDate: undefined, endDate: undefined });
    };

    if (!hasRole([Role.ADMIN])) {
        return <Alert message="Access Denied" description="You do not have permission to view the audit log." type="error" showIcon />;
    }

    const columns = [
        { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'), width: 180 },
        { title: 'User', dataIndex: 'userEmail', key: 'userEmail', render: (email: string, record: AuditLogData) => record.user?.name || email },
        { title: 'Action', dataIndex: 'action', key: 'action', render: (action: string) => <Tag>{action.replace(/_/g, ' ')}</Tag> },
        { title: 'Entity', dataIndex: 'entity', key: 'entity', render: (text?: string) => text || 'N/A' },
        { title: 'Entity ID', dataIndex: 'entityId', key: 'entityId', render: (text?: string) => text ? <Tooltip title={text}><code>{text.substring(0, 8)}...</code></Tooltip> : 'N/A' },
        { title: 'Details', dataIndex: 'details', key: 'details', render: (details: any) => details ? <pre style={{ margin: 0, background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(details, null, 2)}</pre> : 'N/A' },
    ];

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>System Audit Log</Title>

            <Card title="Filters" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Filter by User"
                            style={{ width: '100%' }}
                            onChange={(value) => handleFilterChange('userId', value)}
                            loading={usersLoading}
                            allowClear
                            showSearch
                            filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                        >
                            {usersData?.users.map(u => <Option key={u.id} value={u.id}>{u.name || u.email}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Filter by Action"
                            style={{ width: '100%' }}
                            onChange={(value) => handleFilterChange('action', value)}
                            allowClear
                        >
                            {Object.values(AuditLogAction).map(a => <Option key={a} value={a}>{a.replace(/_/g, ' ')}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <RangePicker style={{ width: '100%' }} onChange={(dates) => handleFilterChange('dateRange', dates)} />
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                        <Space>
                            <Button type="primary" icon={<FilterOutlined />} onClick={() => refetch()} loading={loading}>Apply</Button>
                            <Button icon={<ReloadOutlined />} onClick={resetFilters}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={data?.auditLogs}
                loading={loading}
                rowKey="id"
                pagination={{ pageSize: 20, showSizeChanger: true }}
                scroll={{ x: 'max-content' }}
                bordered
            />
        </div>
    );
};

export default AuditLogPage;