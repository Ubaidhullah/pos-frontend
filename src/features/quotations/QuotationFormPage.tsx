import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import {
  Form, Input, InputNumber, Button, Select, DatePicker, Space, Card, Row, Col, Typography,
  Divider, Spin, Empty, Alert,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// --- Local Imports ---
import { GET_CUSTOMERS } from '../../apollo/queries/customerQueries';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { GET_QUOTATION_BY_ID, GET_QUOTATIONS } from '../../apollo/queries/quotationQueries';
import { CREATE_QUOTATION, UPDATE_QUOTATION } from '../../apollo/mutations/quotationMutations';
import { useAuth } from '../../contexts/AuthContext';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { DiscountType } from '../../common/enums/discount-type.enum';
import { QuotationStatus } from '../../common/enums/quotation-status.enum';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// --- Interfaces ---
interface CustomerInfo { id: string; name: string; }
interface ProductInfo { id: string; name: string; sku?: string; price: number; taxes?: { rate: number }[] }
interface QuotationItemFormValue {
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
}
interface QuotationFormValues {
  customerId?: string;
  validUntil: dayjs.Dayjs;
  notes?: string;
  items: QuotationItemFormValue[];
  orderDiscountType?: DiscountType;
  orderDiscountValue?: number;
}

// 1. Define a more complete interface for the settings data
interface SettingsInfo {
  pricesEnteredWithTax: boolean;
  displayCurrency?: string;
  baseCurrency?: string;
}

const QuotationFormPage: React.FC = () => {
  const { id: quoteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<QuotationFormValues>();
  const { messageApi } = useAntdNotice();
  const isEditMode = !!quoteId;

  const [totals, setTotals] = useState({ grandTotal: 0, subTotal: 0, totalDiscount: 0, totalTax: 0 });

  // --- Data Fetching ---
  // 2. Update the useQuery hook to expect the new currency fields
  const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);
  const { data: customersData, loading: customersLoading } = useQuery<{ customers: CustomerInfo[] }>(GET_CUSTOMERS);
  const { data: productsData, loading: productsLoading } = useQuery<{ products: ProductInfo[] }>(GET_PRODUCTS);
  const [fetchQuote, { data: quoteData, loading: quoteLoading, error: quoteError }] = useLazyQuery(GET_QUOTATION_BY_ID);

  // --- Mutations ---
  const [createQuote, { loading: createLoading }] = useMutation(CREATE_QUOTATION);
  const [updateQuote, { loading: updateLoading }] = useMutation(UPDATE_QUOTATION);

  // 3. Define the currencySymbol with fallbacks, memoized for efficiency
  const currencySymbol = useMemo(() => {
    return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
  }, [settingsData]);

  const pricesEnteredWithTax = settingsData?.settings.pricesEnteredWithTax || false;

  const calculateTotals = useCallback((items: QuotationItemFormValue[] = [], orderDiscount: any = {}) => {
    let itemsTotal = 0, totalLineItemDiscount = 0, totalTaxAmount = 0;
    items.forEach(item => {
        const lineTotal = (item?.unitPrice || 0) * (item?.quantity || 0);
        itemsTotal += lineTotal;
        let lineDiscountAmount = 0;
        if (item.discountType === DiscountType.PERCENTAGE) lineDiscountAmount = lineTotal * ((item.discountValue || 0) / 100);
        else if (item.discountType === DiscountType.FIXED_AMOUNT) lineDiscountAmount = item.discountValue || 0;
        totalLineItemDiscount += Math.min(lineDiscountAmount, lineTotal);
        const priceAfterDiscount = lineTotal - lineDiscountAmount;
        let lineTaxAmount = 0;
        const taxRate = item.taxRate || 0;
        if (taxRate > 0) {
            if (pricesEnteredWithTax) lineTaxAmount = priceAfterDiscount - (priceAfterDiscount / (1 + taxRate / 100));
            else lineTaxAmount = priceAfterDiscount * (taxRate / 100);
        }
        totalTaxAmount += lineTaxAmount;
    });
    const subTotal = itemsTotal - totalLineItemDiscount;
    let orderDiscountAmount = 0;
    if (orderDiscount.type === DiscountType.PERCENTAGE) orderDiscountAmount = subTotal * ((orderDiscount.value || 0) / 100);
    else if (orderDiscount.type === DiscountType.FIXED_AMOUNT) orderDiscountAmount = orderDiscount.value || 0;
    const grandTotal = subTotal - orderDiscountAmount + totalTaxAmount;
    setTotals({ grandTotal, subTotal: itemsTotal, totalDiscount: totalLineItemDiscount + orderDiscountAmount, totalTax: totalTaxAmount });
  }, [pricesEnteredWithTax]);

  // ... (the rest of your hooks and handlers remain the same)
  const handleFormValuesChange = (_: any, allValues: QuotationFormValues) => {
    calculateTotals(allValues.items, { type: allValues.orderDiscountType, value: allValues.orderDiscountValue });
  };
  
  const handleProductSelect = (productId: string, itemIndex: number) => {
    const product = productsData?.products.find(p => p.id === productId);
    if (product) {
        const items = form.getFieldValue('items');
        const totalTaxRate = product.taxes?.reduce((sum, tax) => sum + tax.rate, 0) || 0;
        items[itemIndex] = { ...items[itemIndex], unitPrice: product.price, taxRate: totalTaxRate };
        form.setFieldsValue({ items: [...items] });
        calculateTotals(items, form.getFieldsValue());
    }
  };

  useEffect(() => {
    if (isEditMode && quoteId) {
      fetchQuote({ variables: { id: quoteId } });
    } else {
      const initialValues = { validUntil: dayjs().add(30, 'day'), items: [{ quantity: 1 }] };
      form.setFieldsValue(initialValues);
      calculateTotals(initialValues.items);
    }
  }, [isEditMode, quoteId, fetchQuote, form, calculateTotals]);

  useEffect(() => {
    if (isEditMode && quoteData?.quotation) {
      const { quotation } = quoteData;
      const itemsWithTax = quotation.items.map((item: any) => ({
        ...item,
        productId: item.product.id,
        taxRate: productsData?.products.find(p => p.id === item.product.id)?.taxes?.reduce((sum, t) => sum + t.rate, 0) || 0
      }));
      const formData = { ...quotation, validUntil: dayjs(quotation.validUntil), items: itemsWithTax };
      form.setFieldsValue(formData);
      calculateTotals(formData.items, formData);
    }
  }, [isEditMode, quoteData, productsData, form, calculateTotals]);
  
  const onFinish = async (values: QuotationFormValues) => {
    if (!values.validUntil) {
      messageApi.error('The "Valid Until" date is required.');
      return;
    }

    const submissionItems = (values.items || [])
      .filter(item => item && item.productId && (item.quantity || 0) > 0)
      .map(({ taxRate, ...item }) => ({
        productId: item.productId!,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountValue: Number(item.discountValue || 0),
        discountType: item.discountType || DiscountType.NONE,
      }));

    if (submissionItems.length === 0) { messageApi.error('A quotation must have at least one item.'); return; }
    
    const submissionInput = {
      customerId: values.customerId,
      validUntil: values.validUntil.toISOString(),
      notes: values.notes,
      items: submissionItems,
      orderDiscountType: values.orderDiscountType || DiscountType.NONE,
      orderDiscountValue: Number(values.orderDiscountValue || 0),
    };
    
    try {
      if (isEditMode && quoteId) {
        await updateQuote({ variables: { id: quoteId, updateQuotationInput: submissionInput } });
        messageApi.success('Quotation updated successfully!');
      } else {
        const result = await createQuote({ variables: { createQuotationInput: submissionInput } });
        messageApi.success(`Quotation #${result.data.createQuotation.quoteNumber} created!`);
      }
      navigate('/quotations');
    } catch (err: any) {
      messageApi.error(`Failed to save quotation: ${err.message}`);
    }
  };

  const formIsDisabled = isEditMode && quoteData?.quotation.status !== QuotationStatus.DRAFT;

  if (quoteLoading && isEditMode) return <div style={{textAlign: 'center', padding: '50px'}}><Spin size="large"/></div>;
  if (quoteError) return <Alert message="Error loading quotation" description={quoteError.message} type="error" showIcon />;

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 24 }}><Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/quotations')}>Back</Button><Title level={2} style={{ margin: 0 }}>{isEditMode ? 'Edit Quotation' : 'Create New Quotation'}</Title></Space>
      {formIsDisabled && <Alert message="This quotation cannot be edited as its status is not DRAFT." type="warning" showIcon style={{marginBottom: 16}}/>}
      
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleFormValuesChange}>
        <Card title="Quotation Details">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="customerId" label="Customer">
                <Select showSearch placeholder="Select a customer" loading={customersLoading} disabled={formIsDisabled} filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}>
                  {customersData?.customers.map((c: any) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="validUntil" label="Valid Until" rules={[{ required: true, message: 'This field is required.' }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled={formIsDisabled} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="notes" label="Notes"><TextArea rows={2} disabled={formIsDisabled}/></Form.Item>
            </Col>
          </Row>
        </Card>
        
        <Card title="Quotation Items" style={{marginTop: 24}}>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                    <Row key={key} gutter={16} align="bottom" style={{marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0'}}>
                      <Col flex="auto"><Form.Item {...restField} name={[name, 'productId']} label={index === 0 ? "Product" : ""} rules={[{ required: true }]}><Select showSearch placeholder="Select product" loading={productsLoading} disabled={formIsDisabled} onChange={(value) => handleProductSelect(value, name)} filterOption={(input, option) => (option?.children as any)?.toLowerCase().includes(input.toLowerCase())}>{productsData?.products.map(p => <Option key={p.id} value={p.id}>{p.name} (SKU: {p.sku || 'N/A'})</Option>)}</Select></Form.Item></Col>
                      <Col xs={12} sm={4}><Form.Item {...restField} name={[name, 'quantity']} label={index === 0 ? "Qty" : ""}><InputNumber style={{ width: '100%' }} min={1} disabled={formIsDisabled} /></Form.Item></Col>
                      {/* 4. Use the dynamic currencySymbol in the InputNumber addonBefore prop */}
                      <Col xs={12} sm={4}><Form.Item {...restField} name={[name, 'unitPrice']} label={index === 0 ? "Unit Price" : ""}><InputNumber addonBefore={currencySymbol} style={{ width: '100%' }} min={0} precision={2} disabled={formIsDisabled} /></Form.Item></Col>
                      {/* 5. And here for the line item subtotal */}
                      <Col flex="80px" style={{textAlign: 'right'}}><Form.Item label={index === 0 ? "Subtotal" : ""}><Text strong>{currencySymbol}{((form.getFieldValue(['items', name, 'quantity']) || 0) * (form.getFieldValue(['items', name, 'unitPrice']) || 0)).toFixed(2)}</Text></Form.Item></Col>
                      <Col flex="32px"><Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} disabled={formIsDisabled} /></Col>
                    </Row>
                ))}
                {!formIsDisabled && <Button type="dashed" onClick={() => add({ quantity: 1, unitPrice: 0 })} block icon={<PlusOutlined />}>Add Item</Button>}
              </>
            )}
          </Form.List>
        </Card>
        
        {/* 6. Use the dynamic currencySymbol in the final totals section */}
        <Row justify="end" style={{ marginTop: 24, paddingRight: 16 }}>
            <Col>
                <Space direction="vertical" align="end">
                    <Text>Items Subtotal: {currencySymbol}{totals.subTotal.toFixed(2)}</Text>
                    <Text type="success">Discount: -{currencySymbol}{totals.totalDiscount.toFixed(2)}</Text>
                    <Text>Tax: {currencySymbol}{totals.totalTax.toFixed(2)}</Text>
                    <Title level={4}>Grand Total: {currencySymbol}{totals.grandTotal.toFixed(2)}</Title>
                </Space>
            </Col>
        </Row>
          
        <Form.Item style={{ marginTop: 32, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => navigate('/quotations')}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={createLoading || updateLoading} disabled={formIsDisabled}>{isEditMode ? 'Save Changes' : 'Save Quotation'}</Button>
            </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default QuotationFormPage;
