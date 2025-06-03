import React, { useEffect, useState } from 'react';
import { Modal, Form, Button, message, Spin, Typography, Table, InputNumber, DatePicker, Alert, Input } from 'antd';
import { useMutation, useLazyQuery } from '@apollo/client';
import { RECEIVE_PURCHASE_ORDER_ITEMS } from '../../apollo/mutations/purchaseOrderMutations';
import { GET_PURCHASE_ORDERS, GET_PURCHASE_ORDER_BY_ID } from '../../apollo/queries/purchaseOrderQueries';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface POItemDetail {
  id: string; // PurchaseOrderItem ID
  productId: string;
  product: {
    id: string;
    name: string;
    sku?: string;
  };
  quantityOrdered: number;
  quantityReceived: number;
}

interface PurchaseOrderForReceiving {
  id: string;
  poNumber: string;
  items: POItemDetail[];
}

interface ReceiveItemFormValue {
  purchaseOrderItemId: string; // This MUST be present
  quantityReceivedThisTime?: number;
}
interface ReceivePOFormValues {
  itemsReceived: ReceiveItemFormValue[];
  actualDeliveryDate?: dayjs.Dayjs;
}

interface ReceivePOItemsModalProps {
  open: boolean;
  onClose: () => void;
  purchaseOrderId: string | null;
}

const ReceivePOItemsModal: React.FC<ReceivePOItemsModalProps> = ({ open, onClose, purchaseOrderId }) => {
  const [form] = Form.useForm<ReceivePOFormValues>();
  const [poDetails, setPoDetails] = useState<PurchaseOrderForReceiving | null>(null);

  const [fetchPODetails, { data: poData, loading: poLoading, error: poError }] = useLazyQuery(
    GET_PURCHASE_ORDER_BY_ID,
    {
      fetchPolicy: 'network-only',
    }
  );

  const [receiveItems, { loading: receiveLoading }] = useMutation(RECEIVE_PURCHASE_ORDER_ITEMS, {
    onCompleted: (data) => {
      message.success(`Items received for PO #${poDetails?.poNumber}. New PO Status: ${data.receivePurchaseOrderItems.status}`);
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to receive items: ${error.message}`);
    },
    refetchQueries: [
      { query: GET_PURCHASE_ORDERS },
      purchaseOrderId ? { query: GET_PURCHASE_ORDER_BY_ID, variables: { id: purchaseOrderId } } : undefined,
    ].filter(Boolean) as any, // Filter out undefined if purchaseOrderId is null
  });

  useEffect(() => {
    if (open && purchaseOrderId && (!poDetails || poDetails.id !== purchaseOrderId)) {
      // Fetch only if modal is open, PO ID provided, and details not yet fetched/set for this PO
      fetchPODetails({ variables: { id: purchaseOrderId } });
    } else if (!open) {
      setPoDetails(null);
      form.resetFields();
    }
  }, [open, purchaseOrderId, fetchPODetails, poDetails, form]);

  useEffect(() => {
    if (open && poData?.purchaseOrder && poData.purchaseOrder.id === purchaseOrderId) {
      const { purchaseOrder } = poData;
      setPoDetails(purchaseOrder as PurchaseOrderForReceiving);
      const initialFormItems = purchaseOrder.items.map((item: POItemDetail) => ({
        purchaseOrderItemId: item.id, // This is the PurchaseOrderItem ID
        quantityReceivedThisTime: 0,   // Default to 0 for input
      }));
      form.setFieldsValue({
        itemsReceived: initialFormItems,
        actualDeliveryDate: dayjs(),
      });
    }
  }, [open, poData, purchaseOrderId, form, setPoDetails]);


  const handleFinish = async (values: ReceivePOFormValues) => {
    if (!poDetails) {
      message.error("PO details not loaded.");
      return;
    }
    console.log("Form values on finish:", JSON.stringify(values, null, 2)); // DIAGNOSTIC

    const itemsToSubmit = values.itemsReceived
      .filter(item => item.quantityReceivedThisTime !== undefined && Number(item.quantityReceivedThisTime) > 0)
      .map(item => {
        if (!item.purchaseOrderItemId) { // Critical Check
            console.error("Missing purchaseOrderItemId for item in form values:", item);
            // This should not happen if Form.Item for purchaseOrderItemId is correctly registered
        }
        return {
          purchaseOrderItemId: item.purchaseOrderItemId,
          quantityReceivedThisTime: Number(item.quantityReceivedThisTime),
        };
      });

    if (itemsToSubmit.length === 0) {
      message.warning('Please enter quantities for at least one item to receive.');
      return;
    }

    // Client-side validation for over-receiving
    for (const submittedItem of itemsToSubmit) {
      if (!submittedItem.purchaseOrderItemId) {
        message.error('A system error occurred: PO Item ID is missing. Please try again.');
        return;
      }
      const originalItem = poDetails.items.find(i => i.id === submittedItem.purchaseOrderItemId);
      if (originalItem) {
        const remainingToReceive = originalItem.quantityOrdered - originalItem.quantityReceived;
        if (submittedItem.quantityReceivedThisTime > remainingToReceive) {
          message.error(`Cannot receive ${submittedItem.quantityReceivedThisTime} for ${originalItem.product.name}. Max remaining: ${remainingToReceive}.`);
          return;
        }
      } else {
          message.error(`Could not find original item details for ID ${submittedItem.purchaseOrderItemId}.`);
          return;
      }
    }

    receiveItems({
      variables: {
        receivePurchaseOrderItemsInput: {
          purchaseOrderId: poDetails.id,
          itemsReceived: itemsToSubmit,
          actualDeliveryDate: values.actualDeliveryDate ? values.actualDeliveryDate.toISOString() : undefined,
        },
      },
    });
  };

  const itemColumns = [
    { title: 'Product', dataIndex: ['product', 'name'], key: 'productName', width: '35%', render: (name: string, record: POItemDetail) => <span>{name} <Text type="secondary">(SKU: {record.product.sku || 'N/A'})</Text></span> },
    { title: 'Ordered', dataIndex: 'quantityOrdered', key: 'ordered', width: '10%', align: 'center' as 'center'},
    { title: 'Prev. Received', dataIndex: 'quantityReceived', key: 'received', width: '15%', align: 'center' as 'center' },
    {
      title: 'Remaining',
      key: 'remaining',
      width: '10%', align: 'center' as 'center',
      render: (_: any, record: POItemDetail) => record.quantityOrdered - record.quantityReceived,
    },
    {
      title: 'Receive Now',
      key: 'receiveNow',
      width: '20%',
      render: (_: any, record: POItemDetail, index: number) => { // index here is from the dataSource
        const remaining = record.quantityOrdered - record.quantityReceived;
        if (remaining <= 0 && record.quantityOrdered > 0) return <Text type="success" style={{display: 'block', textAlign: 'center'}}>Fully Received</Text>;
        if (record.quantityOrdered === 0) return <Text type="secondary" style={{display: 'block', textAlign: 'center'}}>N/A</Text>;
        return (
          <Form.Item
            name={['itemsReceived', index, 'quantityReceivedThisTime']}
            noStyle
            rules={[
                { type: 'number', min: 0, message: 'Min 0' },
                { validator: async (_, value) => {
                    if (value > remaining) {
                        return Promise.reject(new Error(`Max ${remaining}`));
                    }
                    return Promise.resolve();
                }}
            ]}
          >
            <InputNumber min={0} max={remaining} placeholder="Qty" style={{width: '100%'}} />
          </Form.Item>
        );
      },
    },
    // THIS IS THE CRUCIAL HIDDEN FIELD - It must be part of the columns rendered by the table
    // for Form.List to correctly associate it.
    {
        title: 'ItemID', // Not visible, but the column needs to exist
        key: 'hiddenItemId',
        dataIndex: 'id', // Corresponds to POItemDetail.id
        render: (id: string, _: POItemDetail, index: number) => (
            <Form.Item
                name={['itemsReceived', index, 'purchaseOrderItemId']}
                initialValue={id} // Set from the record's id
                hidden // AntD Form.Item prop to hide it
            >
                <Input /> {/* Input is needed for Form.Item to register its value */}
            </Form.Item>
        ),
        // Optional: make the column visually hidden if 'hidden' prop isn't enough
        width: 0,
        className: 'visually-hidden-column', // Add a CSS class to hide if needed
    }
  ];

  if (open && poLoading) {
    return <Modal title="Receive Items" open={open} onCancel={onClose} footer={null}><div style={{textAlign: 'center', padding: '50px'}}><Spin size="large" tip="Loading PO Details..."/></div></Modal>;
  }
  if (open && poError) {
    return <Modal title="Error" open={open} onCancel={onClose} footer={[<Button key="close" onClick={onClose}>Close</Button>]}><Alert message="Error loading PO details" description={poError.message} type="error" showIcon /></Modal>;
  }
  if (open && !poDetails && !poLoading) { // Added !poLoading to prevent flicker
    return <Modal title="Receive Items" open={open} onCancel={onClose} footer={null}><div style={{textAlign: 'center', padding: '50px'}}><Alert message="Could not load PO details or no PO specified." type="warning" showIcon /></div></Modal>;
  }

  return (
    <Modal
      title={`Receive Items for PO #${poDetails?.poNumber || ''}`}
      open={open}
      onCancel={onClose}
      width={900} // Increased width for better table layout
      confirmLoading={receiveLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={receiveLoading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={receiveLoading} onClick={() => form.submit()}>
          Confirm Receipt & Update Stock
        </Button>,
      ]}
      destroyOnClose // Important to reset form state when modal is closed and re-opened
    >
      {poDetails && open ? (
        <Form form={form} layout="vertical" name="receivePOItemsForm" onFinish={handleFinish}>
          <Alert
            message="Instructions"
            description="Enter the quantity received for each item in this shipment. Stock levels will be updated accordingly. Items already fully received cannot have more units added."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="actualDeliveryDate" label="Actual Delivery Date" initialValue={dayjs()}>
            <DatePicker format="YYYY-MM-DD" style={{width: '100%'}}/>
          </Form.Item>

          <Title level={5} style={{marginTop: 20}}>Items to Receive:</Title>
          <Table
            columns={itemColumns} // Ensure the hidden column is included here
            dataSource={poDetails.items}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
          />
        </Form>
      ) : null}
    </Modal>
  );
};

export default ReceivePOItemsModal;