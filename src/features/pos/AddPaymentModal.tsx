import React, { useEffect, useState } from 'react';
import { Modal, Form, Button, Space, Statistic, Divider, message, InputNumber, Select } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation } from '@apollo/client';
import { ADD_PAYMENT_TO_ORDER_MUTATION } from '../../apollo/mutations/orderMutations';
import {  GET_ORDERS, GET_ORDER_DETAILS_BY_ID } from '../../apollo/queries/orderQueries';
import PaymentFormSection from './PaymentFormSection'; // We will create a reusable component
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import type { PaymentInput } from './PaymentModal';

interface OrderForPayment {
  id: string;
  billNumber: string;
  grandTotal: number;
  amountPaid: number;
}

interface AddPaymentModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderForPayment | null;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ open, onClose, order }) => {
    const { messageApi } = useAntdNotice();
    const [form] = Form.useForm();
    
    const [addPayment, { loading }] = useMutation(ADD_PAYMENT_TO_ORDER_MUTATION, {
        onCompleted: () => {
            messageApi.success('Payment successfully added to order.');
            onClose(); // This will trigger refetch on the list page
        },
        onError: (err) => messageApi.error(`Failed to add payment: ${err.message}`),
        // Refetch both the list and the specific order if a detail page is open
        refetchQueries: [
            { query: GET_ORDERS },
            order ? { query: GET_ORDER_DETAILS_BY_ID, variables: { id: order.id } } : ''
        ].filter(Boolean)
    });

    const amountRemaining = (order?.grandTotal || 0) - (order?.amountPaid || 0);

    const handleFinish = (values: { payments: PaymentInput[] }) => {
        if (!order) return;
        
        // Filter out any empty payment lines before submitting
        const validPayments = values.payments.filter(p => p && p.amount > 0);
        
        if (validPayments.length === 0) {
            messageApi.warning("Please enter a payment amount.");
            return;
        }

        addPayment({
            variables: {
                addPaymentToOrderInput: {
                    orderId: order.id,
                    payments: validPayments,
                }
            }
        });
    };

    // Reset form when modal is closed or order changes
    useEffect(() => {
        if (!open) {
            form.resetFields();
        }
    }, [open, form]);

    return (
        <Modal
            title={`Add Payment to Order #${order?.billNumber}`}
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose} disabled={loading}>Cancel</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>Submit Payment</Button>,
            ]}
            destroyOnClose
            width={700}
        >
            {order && (
                <div>
                    <Statistic title="Amount Remaining" value={amountRemaining > 0 ? amountRemaining : 0} precision={2} prefix="$" />
                    <Divider/>
                    {/* We use a self-contained form component here */}
                    <PaymentFormSection
                        form={form}
                        onFinish={handleFinish}
                        totalAmountDue={amountRemaining > 0 ? amountRemaining : 0}
                    />
                </div>
            )}
        </Modal>
    );
};

// --- Reusable Payment Form Section ---
// To avoid code duplication, you can create this in a separate file,
// e.g., src/features/pos/PaymentFormSection.tsx and import it in both
// PaymentModal.tsx and AddPaymentModal.tsx

export default AddPaymentModal;

