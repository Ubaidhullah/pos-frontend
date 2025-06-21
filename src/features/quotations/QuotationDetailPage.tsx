import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Spin, Alert, Descriptions, Card, Table, Tag, Typography, Button, Row, Col, Space } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { GET_QUOTATION_BY_ID } from '../../apollo/queries/quotationQueries';
import QuotationPrintLayout from './QuotationPrintLayout';

const { Title, Text } = Typography;

const QuotationDetailPage: React.FC = () => {
  const { id: quoteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_QUOTATION_BY_ID, { variables: { id: quoteId } });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Receipt-${data?.quotation.quoteNumber || 'Unknown'}`,
        onAfterPrint: () => printRef.current?.focus(),
      });
   

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error loading quotation"
        description={error.message}
        type="error"
        showIcon
        style={{ margin: '24px' }}
      />
    );
  }

  const quote = data?.quotation;
  if (!quote) {
    return <Alert message="Quotation not found." type="warning" showIcon style={{ margin: '24px' }} />;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* Header Section */}
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/quotations')}>
                Back to List
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Quotation #{quote.quoteNumber}
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              size="middle"
            >
              Print Quotation
            </Button>
          </Col>
        </Row>

        {/* Quotation Display */}
        <Card
          title="Quotation Summary"
          bordered={false}
          bodyStyle={{ padding: '24px' }}
        >
          <QuotationPrintLayout quote={quote} />
        </Card>
      </Space>

      {/* Hidden Printable Content */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef}>
          <QuotationPrintLayout quote={quote} />
        </div>
      </div>
    </div>
  );
};

export default QuotationDetailPage;