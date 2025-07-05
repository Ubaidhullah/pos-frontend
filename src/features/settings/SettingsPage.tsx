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
  Radio,
  Switch, // Added Switch for the new toggles
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import { UPDATE_SETTINGS } from '../../apollo/mutations/settingsMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import TextArea from 'antd/es/input/TextArea';

const { Title, Text } = Typography;
const { Option } = Select;

// --- Interface for all settings data ---
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
  allowPriceEdit: boolean;
  allowNegativeStock: boolean;
  cashDenominations: number[];
  receiptShowLogo: boolean;
  receiptHeader?: string;
  receiptFooter?: string;
  telegramApiKey?: string;
  telegramManagerChatId?: string;
}

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm<SettingsData>();
  const { hasRole } = useAuth();
  const { messageApi } = useAntdNotice();

  const { data, loading: queryLoading, error: queryError } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  const [updateSettings, { loading: mutationLoading }] = useMutation(UPDATE_SETTINGS);

  useEffect(() => {
    if (data?.settings) {
      form.setFieldsValue(data.settings);
    }
  }, [data, form]);

  const onFinish = async (values: SettingsData) => {
    // Process all values before sending to the backend
    const processedValues = {
      ...values,
      allowPriceEdit: !!values.allowPriceEdit,
      allowNegativeStock: !!values.allowNegativeStock,
      pricesEnteredWithTax: !!values.pricesEnteredWithTax,
      receiptShowLogo: !!values.receiptShowLogo,
      // Convert string tags from the Select component back to numbers and sort them
      cashDenominations: (values.cashDenominations || [])
        .map(val => Number(val))
        .filter(n => !isNaN(n) && n > 0)
        .sort((a, b) => b - a),
    };

    try {
      await updateSettings({
        variables: {
          updateSettingsInput: processedValues,
        },
      });
      messageApi.success('Settings updated successfully!');
    } catch (e: any) {
      messageApi.error(`Failed to update settings: ${e.message}`);
    }
  };

  const timezones = [ 'UTC', 'Indian/Maldives', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Taipei', 'Europe/London', 'America/New_York' ];
  const currencies = ['MVR', 'USD', 'EUR', 'GBP', 'INR', 'SGD'];

  if (!hasRole([Role.ADMIN])) return <Alert message="Access Denied" description="Only administrators can access this page." type="error" showIcon />;
  if (queryLoading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" tip="Loading Settings..." /></div>;
  if (queryError) return <Alert message="Error" description={`Could not load settings: ${queryError.message}`} type="error" showIcon />;

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Application Settings</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="General, Financial, & Payment Settings">
              {/* General Info */}
              <Form.Item name="companyName" label="Company Name"><Input placeholder="Your Company LLC" /></Form.Item>
              <Form.Item name="logoUrl" label="Company Logo URL"><Input placeholder="https://example.com/logo.png" /></Form.Item>
              <Form.Item name="address" label="Company Address"><Input.TextArea rows={2} /></Form.Item>
              <Form.Item name="salesEmail" label="Sales Email"><Input placeholder="sales@yourcompany.com" /></Form.Item>
              
              <Divider>Financial Settings</Divider>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="baseCurrency" label="Base Currency" rules={[{ required: true }]}><Select showSearch>{currencies.map(c => <Option key={c} value={c}>{c}</Option>)}</Select></Form.Item></Col>
                <Col span={12}><Form.Item name="displayCurrency" label="Display Currency (Optional)"><Select showSearch allowClear>{currencies.map(c => <Option key={c} value={c}>{c}</Option>)}</Select></Form.Item></Col>
              </Row>
              <Form.Item name="timezone" label="Timezone" rules={[{ required: true }]}><Select showSearch>{timezones.map(tz => <Option key={tz} value={tz}>{tz}</Option>)}</Select></Form.Item>

              <Divider>Tax Settings</Divider>
              <Form.Item name="pricesEnteredWithTax" label="Product Pricing Method" rules={[{ required: true }]}><Radio.Group><Radio.Button value={false}>Exclusive of Tax</Radio.Button><Radio.Button value={true}>Inclusive of Tax</Radio.Button></Radio.Group></Form.Item>

              {/* 👇 NEW Payment Settings Section */}
              <Divider>Payment Settings</Divider>
              <Form.Item name="cashDenominations" label="Cash Denominations" tooltip="Enter common cash bill/coin values. Press Enter after each value.">
                <Select mode="tags" placeholder="Type a number and press Enter (e.g., 1000, 500, 100)" tokenSeparators={[',', ' ']} style={{ width: '100%' }} />
              </Form.Item>

            </Card>
            <Card title="Receipt & Printing Settings" style={{marginTop: 24}}>
                <Form.Item name="receiptShowLogo" label="Display Logo on Receipt" valuePropName="checked">
                    <Switch checkedChildren="Show" unCheckedChildren="Hide" />
                </Form.Item>
                <Form.Item name="receiptHeader" label="Receipt Header Text" help="Optional text to display below the logo.">
                    <TextArea rows={3} placeholder="e.g., Welcome to our store!" />
                </Form.Item>
                <Form.Item name="receiptFooter" label="Receipt Footer Text" help="Optional text for the bottom of the receipt, e.g., return policy, thank you message, or promotions.">
                    <TextArea rows={4} placeholder="e.g., Thank you for shopping with us! Returns accepted within 7 days with receipt." />
                </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Sales & Checkout Settings">
                <Form.Item name="allowPriceEdit" label="Price Editing at Sale" valuePropName="checked" tooltip="Allow cashiers to override item prices in the POS cart.">
                    <Switch checkedChildren="Allowed" unCheckedChildren="Disallowed" />
                </Form.Item>
                <Form.Item name="allowNegativeStock" label="Sell Out-of-Stock Items" valuePropName="checked" tooltip="Allow completing a sale even if stock is zero or negative.">
                    <Switch checkedChildren="Allowed" unCheckedChildren="Disallowed" />
                </Form.Item>
            </Card>
            
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
            <Card title="Telegram Bot Integration" style={{ marginTop: 24 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Configure the API keys to enable order scheduling and notifications via your Telegram bot.
                </Text>
                <Form.Item 
                    name="telegramApiKey" 
                    label="Company Bot API Key"
                    tooltip="A unique key you create to authenticate your bot for this company."
                >
                    <Input.Password placeholder="Enter a secure, secret key" />
                </Form.Item>
                <Form.Item 
                    name="telegramManagerChatId" 
                    label="Manager Notification Chat ID"
                    tooltip="The Telegram Chat ID for the manager or group to receive notifications."
                >
                    <Input placeholder="e.g., 123456789" />
                </Form.Item>
            </Card>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 32 }}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={mutationLoading} size="large">
            Save All Settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SettingsPage;
