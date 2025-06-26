import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, message, Spin, Typography, Table, InputNumber, DatePicker, Alert, Input, Grid, List, Card, Descriptions, Divider } from 'antd';
import { useMutation, useLazyQuery } from '@apollo/client';
import { RECEIVE_PURCHASE_ORDER_ITEMS } from '../../apollo/mutations/purchaseOrderMutations';
import { GET_PURCHASE_ORDERS, GET_PURCHASE_ORDER_BY_ID } from '../../apollo/queries/purchaseOrderQueries';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

// --- Interfaces ---
interface POItemDetail {
  id: string; // PurchaseOrderItem ID
  productId: string;
  product: { id: string; name: string; sku?: string; };
  quantityOrdered: number;
  quantityReceived: number;
}
interface PurchaseOrderForReceiving { id: string; poNumber: string; items: POItemDetail[]; }
interface ReceiveItemFormValue { purchaseOrderItemId: string; quantityReceivedThisTime?: number; }
interface ReceivePOFormValues { itemsReceived: ReceiveItemFormValue[]; actualDeliveryDate?: dayjs.Dayjs; }
interface ReceivePOItemsModalProps { open: boolean; onClose: () => void; purchaseOrderId: string | null; }

const ReceivePOItemsModal: React.FC<ReceivePOItemsModalProps> = ({ open, onClose, purchaseOrderId }) => {
  const [form] = Form.useForm<ReceivePOFormValues>();
  const [poDetails, setPoDetails] = useState<PurchaseOrderForReceiving | null>(null);
  const { messageApi } = useAntdNotice();
  const screens = useBreakpoint();

  const [fetchPODetails, { data: poData, loading: poLoading, error: poError }] = useLazyQuery(
    GET_PURCHASE_ORDER_BY_ID,
    { fetchPolicy: 'network-only' }
  );

  const [receiveItems, { loading: receiveLoading }] = useMutation(RECEIVE_PURCHASE_ORDER_ITEMS, {
    onCompleted: (data) => {
      messageApi.success(`Items received for PO #${poDetails?.poNumber}. New PO Status: ${data.receivePurchaseOrderItems.status}`);
      onClose();
    },
    onError: (error) => {
      messageApi.error(`Failed to receive items: ${error.message}`);
    },
    refetchQueries: [
      { query: GET_PURCHASE_ORDERS },
      purchaseOrderId ? { query: GET_PURCHASE_ORDER_BY_ID, variables: { id: purchaseOrderId } } : undefined,
    ].filter(Boolean) as any,
  });

  useEffect(() => {
    if (open && purchaseOrderId && (!poDetails || poDetails.id !== purchaseOrderId)) {
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
        purchaseOrderItemId: item.id,
        quantityReceivedThisTime: 0,
      }));
      form.setFieldsValue({
        itemsReceived: initialFormItems,
        actualDeliveryDate: dayjs(),
      });
    }
  }, [open, poData, purchaseOrderId, form, setPoDetails]);

  const handleFinish = async (values: ReceivePOFormValues) => {
    if (!poDetails) { messageApi.error("PO details not loaded."); return; }

    const itemsToSubmit = values.itemsReceived
      .filter(item => item.quantityReceivedThisTime !== undefined && Number(item.quantityReceivedThisTime) > 0)
      .map(item => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        quantityReceivedThisTime: Number(item.quantityReceivedThisTime),
      }));

    if (itemsToSubmit.length === 0) { messageApi.warning('Please enter quantities for at least one item.'); return; }

    for (const submittedItem of itemsToSubmit) {
      const originalItem = poDetails.items.find(i => i.id === submittedItem.purchaseOrderItemId);
      if (originalItem) {
        const remainingToReceive = originalItem.quantityOrdered - originalItem.quantityReceived;
        if (submittedItem.quantityReceivedThisTime > remainingToReceive) {
          messageApi.error(`Cannot receive ${submittedItem.quantityReceivedThisTime} for ${originalItem.product.name}. Max remaining: ${remainingToReceive}.`);
          return;
        }
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
    { title: 'Ordered', dataIndex: 'quantityOrdered', key: 'ordered', align: 'center' as 'center'},
    { title: 'Prev. Received', dataIndex: 'quantityReceived', key: 'received', align: 'center' as 'center' },
    { title: 'Remaining', key: 'remaining', align: 'center' as 'center', render: (_: any, record: POItemDetail) => record.quantityOrdered - record.quantityReceived },
    { title: 'Receive Now', key: 'receiveNow', render: (_: any, record: POItemDetail, index: number) => {
        const remaining = record.quantityOrdered - record.quantityReceived;
        return remaining <= 0 && record.quantityOrdered > 0 ? <Text type="success" style={{textAlign: 'center'}}>Fully Received</Text> : (
          <Form.Item name={['itemsReceived', index, 'quantityReceivedThisTime']} noStyle rules={[{ type: 'number', min: 0, message: 'Min 0' }, { validator: async (_, value) => { if (value > remaining) return Promise.reject(new Error(`Max ${remaining}`)); return Promise.resolve(); }}]}>
            <InputNumber min={0} max={remaining} placeholder="Qty" style={{width: '100%'}} />
          </Form.Item>
        );
      },
    },
    { title: 'ItemID', key: 'hiddenItemId', dataIndex: 'id', render: (id: string, _: POItemDetail, index: number) => (<Form.Item name={['itemsReceived', index, 'purchaseOrderItemId']} initialValue={id} hidden><Input /></Form.Item>), width: 0, className: 'visually-hidden-column' }
  ];

  const renderMobileView = () => (
    <List
        dataSource={poDetails?.items || []}
        renderItem={(item, index) => {
            const remaining = item.quantityOrdered - item.quantityReceived;
            return (
                <List.Item>
                    <Card style={{ width: '100%' }}>
                        <Card.Meta 
                            title={item.product.name}
                            description={`SKU: ${item.product.sku || 'N/A'}`}
                        />
                        <Divider style={{ margin: '12px 0'}} />
                        <Descriptions bordered size="small" column={2}>
                            <Descriptions.Item label="Ordered">{item.quantityOrdered}</Descriptions.Item>
                            <Descriptions.Item label="Received">{item.quantityReceived}</Descriptions.Item>
                            <Descriptions.Item label="Remaining" span={2}>{remaining}</Descriptions.Item>
                        </Descriptions>
                        <div style={{marginTop: '12px'}}>
                          <Text>Receive Now:</Text>
                          {remaining > 0 ? (
                            <Form.Item name={['itemsReceived', index, 'quantityReceivedThisTime']} noStyle rules={[{ type: 'number', min: 0, message: 'Min 0'}, { validator: async (_, value) => { if (value > remaining) { return Promise.reject(new Error(`Max ${remaining}`)); } return Promise.resolve(); }}]}>
                                <InputNumber min={0} max={remaining} placeholder="Enter quantity" style={{width: '100%'}} />
                            </Form.Item>
                          ) : <Text type="success" style={{display: 'block'}}>Fully Received</Text>}
                        </div>
                        <Form.Item name={['itemsReceived', index, 'purchaseOrderItemId']} initialValue={item.id} hidden><Input /></Form.Item>
                    </Card>
                </List.Item>
            )
        }}
    />
  );


  if (open && poLoading) { return <Modal title="Receive Items" open={open} onCancel={onClose} footer={null}><div style={{textAlign: 'center', padding: '50px'}}><Spin size="large" tip="Loading PO Details..."/></div></Modal>; }
  if (open && poError) { return <Modal title="Error" open={open} onCancel={onClose} footer={[<Button key="close" onClick={onClose}>Close</Button>]}><Alert message="Error loading PO details" description={poError.message} type="error" showIcon /></Modal>; }
  if (open && !poDetails && !poLoading) { return <Modal title="Receive Items" open={open} onCancel={onClose} footer={null}><div style={{textAlign: 'center', padding: '50px'}}><Alert message="Could not load PO details or no PO specified." type="warning" showIcon /></div></Modal>; }

  return (
    <Modal
      title={`Receive Items for PO #${poDetails?.poNumber || ''}`}
      open={open}
      onCancel={onClose}
      width={screens.md ? 900 : '95vw'}
      confirmLoading={receiveLoading}
      footer={[<Button key="back" onClick={onClose} disabled={receiveLoading}>Cancel</Button>, <Button key="submit" type="primary" loading={receiveLoading} onClick={() => form.submit()}>Confirm Receipt</Button>]}
      destroyOnClose
    >
      {poDetails && open ? (
        <Form form={form} layout="vertical" name="receivePOItemsForm" onFinish={handleFinish}>
          <Alert message="Enter the quantity received for each item. Stock levels will be updated accordingly." type="info" showIcon style={{ marginBottom: 16 }} />
          <Form.Item name="actualDeliveryDate" label="Actual Delivery Date" initialValue={dayjs()}>
            <DatePicker format="YYYY-MM-DD" style={{width: '100%'}}/>
          </Form.Item>

          <Title level={5} style={{marginTop: 20}}>Items to Receive:</Title>
          {screens.md ? (
            <Table
              columns={itemColumns}
              dataSource={poDetails.items}
              rowKey="id"
              pagination={false}
              size="small"
              bordered
            />
          ) : (
            renderMobileView()
          )}
        </Form>
      ) : null}
    </Modal>
  );
};

export default ReceivePOItemsModal;
