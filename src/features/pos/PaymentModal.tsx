import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Select, InputNumber, Space, Statistic, Divider, Row, Col, message, Grid } from 'antd';
import { DollarCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { useBreakpoint } = Grid;

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  notes?: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  totalAmountDue: number;
  onSubmit: (payments: PaymentInput[]) => void;
  isProcessing: boolean;
  isLayaway?: boolean;
  currencySymbol: string; 
}

const PaymentModal: React.FC<PaymentModalProps> = ({ open, onClose, totalAmountDue, onSubmit, isProcessing, isLayaway, currencySymbol }) => {
  const [form] = Form.useForm();
  const [totalPaid, setTotalPaid] = useState(0);
  const { messageApi } = useAntdNotice();
  const screens = useBreakpoint();
  

  // Reset form when modal is opened or closed
  useEffect(() => {
    if (open) {
      // Start with one cash payment line by default, for the full amount
      form.setFieldsValue({
        payments: [{ method: PaymentMethod.CASH, amount: totalAmountDue > 0 ? parseFloat(totalAmountDue.toFixed(2)) : 0 }]
      });
      setTotalPaid(totalAmountDue);
    } else {
      form.resetFields();
      setTotalPaid(0);
    }
  }, [open, totalAmountDue, form]);

  const handleValuesChange = (_: any, allValues: { payments: PaymentInput[] }) => {
    const currentTotalPaid = allValues.payments?.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0) || 0;
    setTotalPaid(currentTotalPaid);
  };

  const handleFinish = (values: { payments: PaymentInput[] }) => {
    if (!isLayaway && totalPaid < totalAmountDue) {
            messageApi.error(`Amount paid is less than total due.`);
            return;
        }
    const validPayments = values.payments.filter(p => p && p.amount > 0);
    onSubmit(validPayments);
  };

  const changeDue = totalPaid - totalAmountDue;

  return (
    <Modal
      title="Process Payment"
      open={open}
      onCancel={onClose}
      width={screens.md ? 600 : 'auto'} // Adjust width for mobile
      footer={[
                <Button key="back" onClick={onClose} disabled={isProcessing}>Cancel</Button>,
                <Button key="submit" type="primary" loading={isProcessing} onClick={form.submit}
                    // Disable button only if it's NOT a layaway and payment is insufficient
                    disabled={!isLayaway && totalPaid < totalAmountDue}
                >
                    {isLayaway ? 'Confirm Deposit & Save' : 'Confirm & Complete Sale'}
                </Button>,
            ]}
      destroyOnClose
    >
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Statistic
            title="Total Amount Due"
            value={totalAmountDue}
            precision={2}
            prefix={currencySymbol}
            valueStyle={{ fontSize: screens.xs ? '1.5em' : '2em' }}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic
            title={changeDue >= 0 ? "Change Due" : "Amount Remaining"}
            value={Math.abs(changeDue)}
            precision={2}
            prefix={currencySymbol}
            valueStyle={{ color: changeDue >= 0 ? '#3f8600' : '#cf1322', fontSize: screens.xs ? '1.5em' : '2em' }}
          />
        </Col>
      </Row>
      <Divider>Payments</Divider>
      <Form form={form} onFinish={handleFinish} onValuesChange={handleValuesChange} autoComplete="off">
        <Form.List name="payments">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                // Use Row and Col for responsive layout
                <Row key={key} gutter={[8, 8]} align="middle" style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={10}>
                    <Form.Item
                      {...restField}
                      name={[name, 'method']}
                      rules={[{ required: true, message: 'Method is required' }]}
                      initialValue={PaymentMethod.CASH}
                      style={{ marginBottom: 0 }}
                    >
                      <Select style={{ width: '100%' }}>
                        {Object.values(PaymentMethod).map(method => (
                          <Select.Option key={method} value={method}>
                            {method.replace('_', ' ')}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={20} sm={11}>
                    <Form.Item
                      {...restField}
                      name={[name, 'amount']}
                      rules={[{ required: true, message: 'Amount is required' }, { type: 'number', min: 0.01 }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber prefix={currencySymbol} precision={2} style={{ width: '100%' }} placeholder="Amount" />
                    </Form.Item>
                  </Col>
                  <Col xs={4} sm={3} style={{ textAlign: 'right' }}>
                     <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      />
                  </Col>
                </Row>
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
    </Modal>
  );
};

export default PaymentModal;
