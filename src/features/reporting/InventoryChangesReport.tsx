import React from 'react';
import { useLazyQuery } from '@apollo/client';
import { Table, Spin, Alert, Tag } from 'antd';
import ReportLayout from './ReportLayout';
import { GET_INVENTORY_CHANGES_REPORT } from '../../apollo/queries/reportingQueries';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const InventoryChangesReport: React.FC = () => {
    const [fetchReport, { data, loading, error }] = useLazyQuery(GET_INVENTORY_CHANGES_REPORT);
    const { messageApi } = useAntdNotice();

    const handleGenerate = (filters: { startDate: string; endDate: string; }) => {
        fetchReport({ variables: { filters } });
    };

    if (error) {
        messageApi.error(`Error fetching report: ${error.message}`);
    }

    type InventoryChangeRow = {
        netChange: number;
        product: {
            id: string;
            name: string;
            sku: string;
        };
    };

    const columns = [
        { title: 'Product Name', dataIndex: ['product', 'name'], key: 'name' },
        { title: 'SKU', dataIndex: ['product', 'sku'], key: 'sku' },
        { 
            title: 'Net Quantity Change', 
            dataIndex: 'netChange', 
            key: 'netChange', 
            align: 'right' as const,
            sorter: (a: InventoryChangeRow, b: InventoryChangeRow) => a.netChange - b.netChange,
            render: (change: number) => (
                <Tag color={change > 0 ? 'green' : change < 0 ? 'red' : 'default'}>
                    {change > 0 ? `+${change}` : change}
                </Tag>
            )
        },
    ];

    return (
        <ReportLayout 
            title="Inventory Changes by Product"
            onGenerate={handleGenerate}
            loading={loading}
            // You can implement export logic here following the same pattern as other reports
        >
            {loading && <div style={{textAlign: 'center', padding: '20px'}}><Spin /></div>}
            {error && <Alert message="Error fetching report" description={error.message} type="error" />}
            {data && <Table columns={columns} dataSource={data.inventoryChangesReport} rowKey={(r) => r.product.id} pagination={{pageSize: 20}} />}
        </ReportLayout>
    );
};

export default InventoryChangesReport;
