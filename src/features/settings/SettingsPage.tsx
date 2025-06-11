import React, { useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Form,
  Input,
  Button,
  message,
  Spin,
  Alert,
  Typography,
  Card,
  Row,
  Col,
  Select,
  Tooltip,
  Divider,
  Radio
} from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import { UPDATE_SETTINGS } from '../../apollo/mutations/settingsMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';

const { Title, Text } = Typography;
const { Option } = Select;

interface SettingsData {
  companyName?: string;
  logoUrl?: string;
  address?: string;
  salesEmail?: string;
  baseCurrency?: string;
  timezone?: string;
  displayCurrency?: string;
  billNumberFormat?: string;
  paymentNumberFormat?: string;
  quoteNumberFormat?: string;
  poNumberFormat?: string;
  pricesEnteredWithTax: boolean;
}

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm<SettingsData>();
  const { hasRole } = useAuth();

  const { data, loading: queryLoading, error: queryError } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  const [updateSettings, { loading: mutationLoading }] = useMutation(UPDATE_SETTINGS);

  useEffect(() => {
    if (data?.settings) {
      form.setFieldsValue(data.settings);
    }
  }, [data, form]);

  const onFinish = async (values: SettingsData) => {
    const processedValues = {
      ...values,
      pricesEnteredWithTax: !!values.pricesEnteredWithTax,
    };
    try {
      await updateSettings({
        variables: {
          updateSettingsInput: processedValues,
        },
      });
      message.success('Settings updated successfully!');
    } catch (e: any) {
      message.error(`Failed to update settings: ${e.message}`);
    }
  };

  const timezones = [
    'UTC',
    'Indian/Maldives',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Taipei',
    'Europe/London',
    'America/New_York',
  ];

  const currencies = ['MVR', 'USD', 'EUR', 'GBP', 'INR', 'SGD'];

  if (!hasRole([Role.ADMIN])) {
    return <Alert message="Access Denied" description="Only administrators can access this page." type="error" showIcon />;
  }

  if (queryLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" tip="Loading Settings..." /></div>;
  }

  if (queryError) {
    return <Alert message="Error" description={`Could not load settings: ${queryError.message}`} type="error" showIcon />;
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Application Settings</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="General Settings">
              <Form.Item name="companyName" label="Company Name">
                <Input placeholder="Your Company LLC" />
              </Form.Item>

              <Form.Item name="logoUrl" label="Company Logo URL" tooltip="Enter a public URL for your company logo.">
                <Input placeholder="https://example.com/logo.png" />
              </Form.Item>

              <Form.Item name="address" label="Company Address">
                <Input.TextArea rows={3} placeholder="123 Main Street, City, Country" />
              </Form.Item>

              <Form.Item name="salesEmail" label="Sales Email" tooltip="Used for CC/BCC on receipts and invoices.">
                <Input placeholder="sales@yourcompany.com" />
              </Form.Item>

              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="baseCurrency" label="Base Currency" rules={[{ required: true }]}>
                    <Select showSearch placeholder="Select base currency">
                      {currencies.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="displayCurrency" label="Display Currency (Optional)" tooltip="Show a second currency on bills for reference.">
                    <Select showSearch placeholder="Select display currency" allowClear>
                      {currencies.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="timezone" label="Timezone" rules={[{ required: true }]}>
                <Select showSearch placeholder="Select timezone">
                  {timezones.map(tz => <Option key={tz} value={tz}>{tz}</Option>)}
                </Select>
              </Form.Item>

              <Divider>Tax Settings</Divider>

              <Form.Item
                name="pricesEnteredWithTax"
                label="Product Pricing Method"
                tooltip="Determines how tax is calculated at checkout."
                rules={[{ required: true, message: 'Please select a pricing method.' }]}
              >
                <Radio.Group>
                  <Radio.Button value={false}>Prices are Exclusive of Tax</Radio.Button>
                  <Radio.Button value={true}>Prices are Inclusive of Tax</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Text type="secondary">
                <b>Exclusive:</b> Tax is added on top of the product price at checkout. (e.g., $100 item + 5% tax = $105 total).<br />
                <b>Inclusive:</b> Tax is already included in the product price. The system will back-calculate the tax portion for reporting. (e.g., $105 item includes $5 of tax).
              </Text>

            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Document Numbering Formats">
              <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                Use placeholders like <code>{'{sequence}'}</code>, <code>{'{year}'}</code>, <code>{'{month}'}</code>, <code>{'{day}'}</code>, and <code>{'{registerNumber}'}</code>.
              </Text>

              <Form.Item
                name="billNumberFormat"
                label="Bill / Invoice Number Format"
                rules={[{ required: true }]}
                tooltip="e.g., INV-{year}-{sequence}"
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="paymentNumberFormat"
                label="Payment Number Format"
                rules={[{ required: true }]}
                tooltip="e.g., PAY/{year}{month}/{sequence}"
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="quoteNumberFormat"
                label="Quotation Number Format"
                rules={[{ required: true }]}
                tooltip="e.g., QT-{sequence}"
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="poNumberFormat"
                label="Purchase Order Number Format"
                rules={[{ required: true }]}
                tooltip="e.g., PO/{year}/{sequence}"
              >
                <Input />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 32 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={mutationLoading}
            size="large"
          >
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SettingsPage;
