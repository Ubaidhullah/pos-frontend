import React, { useMemo } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { Table, Spin, Alert } from 'antd';
import ReportLayout from './ReportLayout';
import { GET_SALES_REPORT } from '../../apollo/queries/reportingQueries';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';


interface SettingsInfo {
  displayCurrency?: string;
  baseCurrency?: string;
}

const ProductSalesReport: React.FC = () => {
    const [fetchReport, { data, loading, error }] = useLazyQuery(GET_SALES_REPORT);
    const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);
    
    const handleGenerate = (filters: { startDate: string; endDate: string; }) => {
        fetchReport({ variables: { filters, groupBy: 'product' } });
    };

    const currencySymbol = useMemo(() => {
              return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
            }, [settingsData]);
    const getExportData = async () => {
        // You might have a separate, leaner export query, but for now we reuse the component's data
        return data?.salesReport.map((item: any) => ({
            product_name: item.product.name,
            sku: item.product.sku,
            units_sold: item._sum.quantity,
            total_revenue: item._sum.finalLineTotal.toFixed(2),
        })) || [];
    };

    const columns = [
        { title: 'Product Name', dataIndex: ['product', 'name'], key: 'name' },
        { title: 'SKU', dataIndex: ['product', 'sku'], key: 'sku' },
        { title: 'Units Sold', dataIndex: ['_sum', 'quantity'], key: 'unitsSold', align: 'right' as const },
        { title: 'Total Revenue', dataIndex: ['_sum', 'finalLineTotal'], key: 'revenue', align: 'right' as const, render: (val: number) => `${currencySymbol}${val.toFixed(2)}` },
    ];

    return (
        <ReportLayout 
            title="Product Sales Report"
            onGenerate={handleGenerate} 
            onExportCSV={getExportData}
            onExportPDF={getExportData}
            pdfHeaders={['Product Name', 'SKU', 'Units Sold', 'Total Revenue']}
            pdfBodyKeys={['product_name', 'sku', 'units_sold', 'total_revenue']}
            loading={loading}
        >
            {loading && <div style={{textAlign: 'center'}}><Spin /></div>}
            {error && <Alert message="Error fetching report" description={error.message} type="error" />}
            {data && <Table columns={columns} dataSource={data.salesReport} rowKey={(r: any) => r.product?.id || r.id || r.sku || r.key} pagination={{pageSize: 15}}/>}
        </ReportLayout>
    );
};

export default ProductSalesReport;
