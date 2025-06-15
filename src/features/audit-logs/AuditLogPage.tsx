import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Typography, Tag, Tooltip, DatePicker, Select, Button, Space, Card, Row, Col, Alert, message } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { GET_AUDIT_LOGS, GET_USERS_FOR_FILTER } from '../../apollo/queries/auditLogQueries';
import { AuditLogAction } from './enums/audit-log-action.enum';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// --- Interfaces for fetched data ---
interface UserFilterData {
    id?: string;
    name?: string;
    email: string;
}

interface AuditLogData {
    id: string;
    action: AuditLogAction;
    entity?: string;
    entityId?: string;
    userEmail: string;
    details?: any; // This will be a JSON object
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
        dateRange?: [dayjs.Dayjs | null, dayjs.Dayjs | null];
    }>({});

    const queryVariables = {
        userId: filters.userId,
        action: filters.action,
        startDate: filters.dateRange?.[0]?.startOf('day').toISOString(),
        endDate: filters.dateRange?.[1]?.endOf('day').toISOString(),
    };

    const { data, loading, error, refetch } = useQuery<{ auditLogs: AuditLogData[] }>(GET_AUDIT_LOGS, {
        variables: queryVariables,
        notifyOnNetworkStatusChange: true,
    });

    const { data: usersData, loading: usersLoading } = useQuery<{ users: UserFilterData[] }>(GET_USERS_FOR_FILTER);

    const handleFilterChange = (filterName: string, value: any) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const resetFilters = () => {
        setFilters({});
        // Refetch with empty variables to clear filters
        refetch({ userId: undefined, action: undefined, startDate: undefined, endDate: undefined });
    };

    if (!hasRole([Role.ADMIN])) {
        return <Alert message="Access Denied" description="You do not have permission to view the audit log." type="error" showIcon />;
    }

    if (error) {
        message.error(`Error loading audit logs: ${error.message}`);
    }

    const actionTagColors: Partial<Record<AuditLogAction, string>> = {
        PRODUCT_CREATED: 'green',
        ORDER_CREATED: 'green',
        PO_CREATED: 'green',
        PRODUCT_UPDATED: 'blue',
        SETTINGS_UPDATED: 'blue',
        USER_ROLE_UPDATED: 'geekblue',
        PRODUCT_DELETED: 'red',
        ORDER_RETURNED: 'purple',
        INVENTORY_ADJUSTED_MANUALLY: 'orange',
        PO_ITEMS_RECEIVED: 'cyan',
    };

    const columns = [
        { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'), width: 180, sorter: (a: AuditLogData, b: AuditLogData) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(), defaultSortOrder: 'descend' as 'descend' },
        { title: 'User', dataIndex: 'userEmail', key: 'userEmail', render: (email: string, record: AuditLogData) => record.user?.name || email },
        { title: 'Action', dataIndex: 'action', key: 'action', render: (action: string) => <Tag color={actionTagColors[action as AuditLogAction] || 'default'}>{action.replace(/_/g, ' ')}</Tag>, filters: Object.values(AuditLogAction).map(a => ({text: a.replace(/_/g, ' '), value: a})), onFilter: (value: any, record: AuditLogData) => record.action === value },
        { title: 'Entity', dataIndex: 'entity', key: 'entity', render: (text?: string) => text || <Text type="secondary">N/A</Text> },
        { title: 'Entity ID', dataIndex: 'entityId', key: 'entityId', render: (text?: string) => text ? <Tooltip title={text}><code>{text.substring(0, 8)}...</code></Tooltip> : <Text type="secondary">N/A</Text> },
        { title: 'Details', dataIndex: 'details', key: 'details', width: '30%', render: (details: any) => details ? <pre style={{ margin: 0, background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px', maxHeight: '100px', overflowY: 'auto' }}>{JSON.stringify(details, null, 2)}</pre> : <Text type="secondary">N/A</Text> },
    ];

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>System Audit Log</Title>

            <Card title="Filters" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} sm={12} md={6}>
                        <Text>User</Text>
                        <Select
                            placeholder="Filter by User"
                            style={{ width: '100%' }}
                            onChange={(value) => handleFilterChange('userId', value)}
                            loading={usersLoading}
                            value={filters.userId}
                            allowClear
                            showSearch
                            filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                        >
                            {usersData?.users.map(u => <Option key={u.id} value={u.id}>{u.name || u.email}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Text>Action</Text>
                        <Select
                            placeholder="Filter by Action"
                            style={{ width: '100%' }}
                            onChange={(value) => handleFilterChange('action', value)}
                            value={filters.action}
                            allowClear
                        >
                            {Object.values(AuditLogAction).map(a => <Option key={a} value={a}>{a.replace(/_/g, ' ')}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Text>Date Range</Text>
                        <RangePicker style={{ width: '100%' }} onChange={(dates) => handleFilterChange('dateRange', dates)} value={filters.dateRange} />
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
                pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} logs` }}
                scroll={{ x: 'max-content' }}
                bordered
            />
        </div>
    );
};

export default AuditLogPage;
