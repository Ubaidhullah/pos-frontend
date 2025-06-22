import React, { useState } from 'react';
import { Button, Space, DatePicker, Typography, message } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as Papa from 'papaparse';
import jsPDF from 'jspdf';
import { autoTable, applyPlugin } from 'jspdf-autotable';

const { Title } = Typography;
const { RangePicker } = DatePicker;
applyPlugin(jsPDF);


declare module 'jspdf' { interface jsPDF { autoTable: (options: any) => jsPDF; } }

interface ReportLayoutProps {
  title: string;
  onGenerate: (filters: { startDate: string; endDate: string; }) => void;
  onExportCSV?: () => Promise<any[]>; // Should return the data array for export
  onExportPDF?: () => Promise<any[]>; // Should return the data array for export
  pdfHeaders?: string[];
  pdfBodyKeys?: string[];
  loading?: boolean;
  children: React.ReactNode;
}

const ReportLayout: React.FC<ReportLayoutProps> = ({ title, onGenerate, onExportCSV, onExportPDF, pdfHeaders, pdfBodyKeys, loading, children }) => {
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs()]);

    const handleGenerate = () => {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            message.error("Please select a valid date range.");
            return;
        }
        onGenerate({
            startDate: dateRange[0].startOf('day').toISOString(),
            endDate: dateRange[1].endOf('day').toISOString(),
        });
    };

    const handleCSVExport = async () => {
        if (!onExportCSV) return;
        const dataToExport = await onExportCSV();
        if (!dataToExport || dataToExport.length === 0) {
            message.warning("No data to export.");
            return;
        }
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${title.replace(/ /g, '-')}-${dayjs().format('YYYY-MM-DD')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    

    const handlePDFExport = async () => {
  if (!onExportPDF || !pdfHeaders || !pdfBodyKeys) return;
  try {
    const data = await onExportPDF();
    if (!data.length) {
      message.warning('No data to export.');
      return;
    }

    const doc = new jsPDF();
    console.log({ data, pdfHeaders, pdfBodyKeys });

    // Use plugin correctly
    doc.autoTable({
      head: [pdfHeaders],
      body: data.map(item =>
        pdfBodyKeys.map(key => item[key] ?? 'N/A')
      ),
    });

    doc.save(`${title.replace(/ /g, '-')}-${dayjs().format('YYYY-MM-DD')}.pdf`);
  } catch (err) {
    console.error('PDF Export Error:', err);
    message.error('Failed to export PDF. See console for info.');
  }
};

    return (
        <div>
            <Title level={4}>{title}</Title>
            <Space style={{ marginBottom: 16 }} wrap>
                <RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as any)} />
                <Button type="primary" icon={<FilterOutlined />} onClick={handleGenerate} loading={loading}>Generate</Button>
                {onExportCSV && <Button icon={<DownloadOutlined />} onClick={handleCSVExport}>Export CSV</Button>}
                {onExportPDF && <Button icon={<FilePdfOutlined />} onClick={handlePDFExport}>Export PDF</Button>}
            </Space>
            <div>{children}</div>
        </div>
    );
};

export default ReportLayout;
