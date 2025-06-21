import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Table, Button, Space, Tag, message, Tooltip, Typography, Select, Card, Row, Col } from 'antd';
import { PlusOutlined, EyeOutlined, CheckCircleOutlined, SyncOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, Link } from 'react-router-dom';
import { GET_QUOTATIONS } from '../../apollo/queries/quotationQueries';
import { UPDATE_QUOTATION_STATUS, CREATE_ORDER_FROM_QUOTATION } from '../../apollo/mutations/quotationMutations';
import { useAuth } from '../../contexts/AuthContext';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { Role } from '../../common/enums/role.enum';
import { QuotationStatus } from '../../common/enums/quotation-status.enum'; // Create this frontend enum

const { Title } = Typography;
const { Option } = Select;

interface QuotationData {
    id: string;
    quoteNumber: string;
    status: QuotationStatus;
    validUntil: string;
    grandTotal: number;
    customer?: { name: string };
}

const QuotationListPage: React.FC = () => {
    const navigate = useNavigate();
    const { messageApi } = useAntdNotice();
    const [filters, setFilters] = useState<{ status?: QuotationStatus; customerId?: string; }>({});

    const { data, loading, error, refetch } = useQuery<{ quotations: QuotationData[] }>(GET_QUOTATIONS, {
        variables: { filters },
    });

    const [updateStatus, { loading: updateStatusLoading }] = useMutation(UPDATE_QUOTATION_STATUS, {
        onCompleted: () => { messageApi.success("Quotation status updated."); refetch(); },
        onError: (err) => messageApi.error(err.message),
    });

    const [createOrder, { loading: createOrderLoading }] = useMutation(CREATE_ORDER_FROM_QUOTATION, {
        onCompleted: (data) => {
            messageApi.success(`Order #${data.createOrderFromQuotation.billNumber} created successfully!`);
            navigate(`/orders/${data.createOrderFromQuotation.id}`);
        },
        onError: (err) => messageApi.error(`Failed to convert to order: ${err.message}`),
    });

    const handleUpdateStatus = (id: string, status: QuotationStatus) => {
        updateStatus({ variables: { id, status } });
    };

    const handleConvertToOrder = (id: string) => {
        createOrder({ variables: { quotationId: id } });
    };

    useEffect(() => {
        if (error) {
            messageApi.error(`Error loading quotations: ${error.message}`);
        }
    }, [error, messageApi]);

    const statusColors: Record<QuotationStatus, string> = {
        [QuotationStatus.DRAFT]: 'blue',
        [QuotationStatus.SENT]: 'geekblue',
        [QuotationStatus.ACCEPTED]: 'purple',
        [QuotationStatus.EXPIRED]: 'default',
        [QuotationStatus.INVOICED]: 'green',
    };

    const columns = [
        { 
            title: 'Quote No.',
            dataIndex: 'quoteNumber',
            key: 'quoteNumber',
            // 👇 FIX: This 'render' function turns the text into a clickable link
            render: (text: string, record: QuotationData) => <Link to={`/quotations/${record.id}`}>{text}</Link> 
        },
        { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer', render: (name: any) => name || 'N/A' },
        { title: 'Valid Until', dataIndex: 'validUntil', key: 'validUntil', render: (date: string | number | Date | dayjs.Dayjs | null | undefined) => dayjs(date).format('YYYY-MM-DD') },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (status: QuotationStatus) => <Tag color={statusColors[status]}>{status}</Tag> },
        { title: 'Total', dataIndex: 'grandTotal', key: 'grandTotal', render: (total: number) => `$${total.toFixed(2)}`, align: 'right' as const },
        {
            title: 'Actions', key: 'actions',
            render: (_: any, record: QuotationData) => (
                <Space>
                    <Tooltip title="View Details"><Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/quotations/${record.id}`)} /></Tooltip>
                    <Tooltip title="edit"><Button size="small" type="primary"icon={<EditOutlined />} onClick={() => navigate(`/quotations/${record.id}/edit`)}/></Tooltip>
                    {record.status === 'DRAFT' && <Button size="small" onClick={() => handleUpdateStatus(record.id, QuotationStatus.SENT)}>Mark as Sent</Button>}
                    {record.status === 'SENT' && <Button size="small" onClick={() => handleUpdateStatus(record.id, QuotationStatus.ACCEPTED)}>Mark as Accepted</Button>}
                    {record.status === 'ACCEPTED' && <Button size="small" type="primary" icon={<SyncOutlined />} onClick={() => handleConvertToOrder(record.id)} loading={createOrderLoading}>Convert to Order</Button>}
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Quotations</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/quotations/new')}>
                    Create Quotation
                </Button>
            </div>
            <Card style={{ marginBottom: 16 }}>
                <Select placeholder="Filter by Status" style={{ width: 200 }} onChange={(value) => setFilters({ status: value })} allowClear>
                    {Object.values(QuotationStatus).map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
            </Card>
            <Table columns={columns} dataSource={data?.quotations} loading={loading} rowKey="id" />
        </div>
    );
};

export default QuotationListPage;