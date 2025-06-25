import React, { useMemo } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { Table, Spin, Alert, Typography } from 'antd';
import ReportLayout from './ReportLayout';
import { GET_OUTSTANDING_BILLS_REPORT } from '../../apollo/queries/reportingQueries';
import dayjs from 'dayjs';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';



const { Text } = Typography;


interface SettingsInfo {
  displayCurrency?: string;
  baseCurrency?: string;
}


const OutstandingBillsReport: React.FC = () => {
  const { messageApi } = useAntdNotice();

  const [fetchReport, { data, loading, error }] = useLazyQuery(GET_OUTSTANDING_BILLS_REPORT, {
    onError: (err) => {
      messageApi.error(`Error fetching report: ${err.message}`);
    }
  });

  const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);

  const currencySymbol = useMemo(() => {
                return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
              }, [settingsData]);

  const handleGenerate = (filters: { startDate: string; endDate: string }) => {
    fetchReport({ variables: { filters } });
  };

  const getExportData = async () => {
    return (
      data?.outstandingBillsReport.map((record: any) => ({
        bill_number: record.billNumber,
        date: dayjs(record.createdAt).format('YYYY-MM-DD'),
        customer: record.customer?.name || 'N/A',
        status: record.status,
        total_due: record.grandTotal.toFixed(2),
        amount_paid: record.amountPaid.toFixed(2),
        remaining: (record.grandTotal - record.amountPaid).toFixed(2),
      })) || []
    );
  };

  const columns = [
    { title: 'Bill Number', dataIndex: 'billNumber', key: 'billNumber' },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (val: string) => dayjs(val).format('YYYY-MM-DD') },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer', render: (name?: string) => name || 'N/A' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Total Due', dataIndex: 'grandTotal', key: 'grandTotal', render: (val: number) => `${currencySymbol}${val.toFixed(2)}`, align: 'right' as const },
    { title: 'Amount Paid', dataIndex: 'amountPaid', key: 'amountPaid', render: (val: number) => `${currencySymbol}${val.toFixed(2)}`, align: 'right' as const },
    {
      title: 'Amount Remaining',
      key: 'due',
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Text type="danger" strong>
          {currencySymbol}{(record.grandTotal - record.amountPaid).toFixed(2)}
        </Text>
      )
    },
  ];

  return (
    <ReportLayout
      title="Outstanding Bills Report"
      onGenerate={handleGenerate}
      onExportCSV={getExportData}
      onExportPDF={getExportData}
      pdfHeaders={['Bill Number', 'Date', 'Customer', 'Status', 'Total Due', 'Amount Paid', 'Remaining']}
      pdfBodyKeys={['bill_number', 'date', 'customer', 'status', 'total_due', 'amount_paid', 'remaining']}
      loading={loading}
    >
      {loading && <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>}
      {error && <Alert message="Error fetching report" description={error.message} type="error" />}
      {data && <Table columns={columns} dataSource={data.outstandingBillsReport} rowKey="id" pagination={{ pageSize: 15 }} />}
    </ReportLayout>
  );
};

export default OutstandingBillsReport;
