import React, { useEffect, useState } from 'react';
import { Modal, Form, Button, Space, Statistic, Divider, message, InputNumber, Select } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { PaymentInput } from './PaymentModal'; // Assuming this is the correct path
import { PaymentMethod } from '../../common/enums/payment-method.enum';

// --- Interface for the component's props ---
interface PaymentFormSectionProps {
  form: any;
  onFinish: (values: any) => void;
  totalAmountDue: number;
  currencySymbol: string; // Add currencySymbol to the props
}

const PaymentFormSection: React.FC<PaymentFormSectionProps> = ({ form, onFinish, totalAmountDue, currencySymbol }) => {
    const [totalPaid, setTotalPaid] = useState(0);

    useEffect(() => {
        const initialAmount = totalAmountDue > 0 ? parseFloat(totalAmountDue.toFixed(2)) : 0;
        form.setFieldsValue({ payments: [{ method: 'CASH', amount: initialAmount }] });
        setTotalPaid(initialAmount);
      }, [totalAmountDue, form]);

    const onValuesChange = (_: any, allValues: { payments: PaymentInput[] }) => {
        const currentTotalPaid = allValues.payments?.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0) || 0;
        setTotalPaid(currentTotalPaid);
    };

    return (
        <Form form={form} onFinish={onFinish} onValuesChange={onValuesChange} autoComplete="off">
            <Form.List name="payments">
                {(fields, { add, remove }) => (
                    <>
                        {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'method']}
                                  rules={[{ required: true, message: 'Method is required'}]}
                                  initialValue={PaymentMethod.CASH}
                                >
                                  <Select style={{ width: 150 }}>
                                    {Object.values(PaymentMethod).map(method => (
                                      <Select.Option key={method} value={method}>
                                        {method.replace('_', ' ')}
                                      </Select.Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'amount']}
                                  rules={[{ required: true, message: 'Amount is required'}]}
                                >
                                  {/* Replace the hardcoded prefix with the currencySymbol prop */}
                                  <InputNumber prefix={currencySymbol} precision={2} style={{ width: 180 }} placeholder="Amount" />
                                </Form.Item>
                                <DeleteOutlined
                                  onClick={() => remove(name)}
                                  style={{ color: 'red', cursor: 'pointer' }}
                                />
                            </Space>
                        ))}
                        <Form.Item>
                          <Button type="dashed" onClick={() => add({ method: PaymentMethod.CARD, amount: 0 })} block icon={<PlusOutlined />}>
                            Add Split Payment
                          </Button>
                        </Form.Item>
                    </>
                )}
            </Form.List>
        </Form>
    );
}

export default PaymentFormSection;