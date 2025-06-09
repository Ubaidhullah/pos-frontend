import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Select, InputNumber, Space, Statistic, Divider, Row, Col, message } from 'antd';
import { DollarCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { PaymentMethod } from '../../common/enums/payment-method.enum'; // Create this frontend enum


// Create this enum file on your frontend
// src/features/enums/payment-method.enum.ts
// export enum PaymentMethod {
//   CASH = 'CASH',
//   CARD = 'CARD',
//   BANK_TRANSFER = 'BANK_TRANSFER',
//   DIGITAL_WALLET = 'DIGITAL_WALLET',
//   CHEQUE = 'CHEQUE',
//   GIFT_CARD = 'GIFT_CARD',
//   STORE_CREDIT = 'STORE_CREDIT',
// }


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
}

const PaymentModal: React.FC<PaymentModalProps> = ({ open, onClose, totalAmountDue, onSubmit, isProcessing }) => {
  const [form] = Form.useForm();
  const [totalPaid, setTotalPaid] = useState(0);

  // Reset form when modal is opened or closed
  useEffect(() => {
    if (open) {
      // Start with one cash payment line by default, for the full amount
      form.setFieldsValue({
        payments: [{ method: PaymentMethod.CASH, amount: totalAmountDue > 0 ? totalAmountDue : 0 }]
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
    if (totalPaid < totalAmountDue) {
        message.error(`Amount paid ($${totalPaid.toFixed(2)}) is less than total due ($${totalAmountDue.toFixed(2)}).`);
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
      width={600}
      footer={[
        <Button key="back" onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isProcessing}
          onClick={() => form.submit()}
          disabled={totalPaid < totalAmountDue}
        >
          Confirm & Complete Sale
        </Button>,
      ]}
      destroyOnClose
    >
      <Row gutter={16} align="middle" style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Statistic
            title="Total Amount Due"
            value={totalAmountDue}
            precision={2}
            prefix="$"
            valueStyle={{ fontSize: '2em' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title={changeDue >= 0 ? "Change Due" : "Amount Remaining"}
            value={Math.abs(changeDue)}
            precision={2}
            prefix="$"
            valueStyle={{ color: changeDue >= 0 ? '#3f8600' : '#cf1322', fontSize: '2em' }}
          />
        </Col>
      </Row>
      <Divider>Payments</Divider>
      <Form form={form} onFinish={handleFinish} onValuesChange={handleValuesChange} autoComplete="off">
        <Form.List name="payments">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'method']}
                    rules={[{ required: true, message: 'Method is required' }]}
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
                    rules={[{ required: true, message: 'Amount is required' }, { type: 'number', min: 0.01 }]}
                  >
                    <InputNumber prefix="$" precision={2} style={{ width: 150 }} placeholder="Amount" />
                  </Form.Item>
                  <DeleteOutlined onClick={() => remove(name)} style={{color: 'red', cursor: 'pointer'}}/>
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add({ method: PaymentMethod.CARD, amount: 0 })} block icon={<PlusOutlined />}>
                  Add Payment Method (for Split Payments)
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