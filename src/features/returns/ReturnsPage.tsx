import React, { useState, useEffect } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  Form,
  Input,
  Button,
  message,
  Spin,
  Alert,
  Typography,
  Card,
  Table,
  InputNumber,
  Divider,
  Row,
  Col,
  Space
} from 'antd';
import { SearchOutlined, ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { GET_ORDER_FOR_RETURN } from '../../apollo/queries/orderQueries';
import { CREATE_SALES_RETURN } from '../../apollo/mutations/returnMutations';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- Interfaces for data and forms ---
interface ProductInfo { id: string; name: string; sku?: string; }
interface OriginalOrderItem {
  id: string; // OrderItemID
  quantity: number;
  quantityReturned: number;
  priceAtSale: number;
  product: ProductInfo;
}
interface OriginalOrder {
  id: string;
  billNumber: string; // Corrected from poNumber
  status: string;
  items: OriginalOrderItem[];
}

interface ReturnItemFormValue {
  originalOrderItemId: string; // This MUST be present
  quantityToReturn: number;
}
interface ReturnFormValues {
  items: ReturnItemFormValue[];
  reason?: string;
}

const ReturnsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [form] = Form.useForm<ReturnFormValues>();

  const [originalOrder, setOriginalOrder] = useState<OriginalOrder | null>(null);
  const [totalRefund, setTotalRefund] = useState<number>(0);

  const [findOrder, { loading: findingOrder, error: findError }] = useLazyQuery<{ order: OriginalOrder }>(
    GET_ORDER_FOR_RETURN,
    {
      onCompleted: (data) => {
        if (data?.order) {
          if (data.order.status === 'RETURNED') {
              message.warning('This order has already been fully returned.');
              setOriginalOrder(null);
              return;
          }
          setOriginalOrder(data.order);
          const initialFormItems = data.order.items.map(item => ({
            originalOrderItemId: item.id,
            quantityToReturn: 0,
          }));
          form.setFieldsValue({ items: initialFormItems });
        } else {
          message.error('Order not found.');
          setOriginalOrder(null);
        }
      },
      fetchPolicy: 'network-only',
    }
  );
  
  const [createReturn, { loading: processingReturn }] = useMutation(CREATE_SALES_RETURN, {
    onCompleted: (data) => {
      message.success(`Return #${data.createSalesReturn.returnNumber} processed successfully! Refund: $${data.createSalesReturn.totalRefundAmount.toFixed(2)}`);
      handleReset();
    },
    onError: (err) => {
      message.error(`Failed to process return: ${err.message}`);
    },
  });

  const handleFindOrder = (orderIdOrBillNumber: string) => {
    if (!orderIdOrBillNumber) {
      message.warning('Please enter an Order ID or Bill Number.');
      return;
    }
    handleReset();
    // Assuming your backend 'order' query can resolve by ID.
    // If you configured it to also find by billNumber, this works. Otherwise, you might need two search fields.
    findOrder({ variables: { id: orderIdOrBillNumber } });
  };

  const handleReset = () => {
    setOriginalOrder(null);
    setTotalRefund(0);
    form.resetFields();
  };

  const handleFormValuesChange = (_: any, allValues: ReturnFormValues) => {
    if (allValues.items && originalOrder) {
      let currentRefund = 0;
      allValues.items.forEach((formItem, index) => {
        const originalItem = originalOrder.items[index];
        if (originalItem && formItem.quantityToReturn > 0) {
          currentRefund += formItem.quantityToReturn * originalItem.priceAtSale;
        }
      });
      setTotalRefund(currentRefund);
    }
  };

  const onFinish = (values: ReturnFormValues) => {
    if (!originalOrder) return;
    console.log("Form values on finish:", JSON.stringify(values, null, 2)); // Good for debugging

    const itemsToReturn = values.items
      .filter(item => item && item.quantityToReturn > 0)
      .map(item => ({
        originalOrderItemId: item.originalOrderItemId, // This should now have the value
        quantityToReturn: Number(item.quantityToReturn),
      }));
    
    if (itemsToReturn.length === 0) {
      message.error('Please enter a quantity for at least one item to return.');
      return;
    }

    // Double-check if any item is missing the ID before sending
    if (itemsToReturn.some(item => !item.originalOrderItemId)) {
        message.error("A system error occurred: an item's ID is missing. Please refresh and try again.");
        console.error("Payload missing originalOrderItemId:", itemsToReturn);
        return;
    }

    createReturn({
      variables: {
        createReturnInput: {
          originalOrderId: originalOrder.id,
          items: itemsToReturn,
          reason: values.reason,
        },
      },
    });
  };

  const itemColumns = [
    { title: 'Product', dataIndex: ['product', 'name'], key: 'name' },
    { title: 'SKU', dataIndex: ['product', 'sku'], key: 'sku' },
    { title: 'Ordered', dataIndex: 'quantity', key: 'ordered', align: 'center' as 'center' },
    { title: 'Prev. Returned', dataIndex: 'quantityReturned', key: 'returned', align: 'center' as 'center' },
    {
        title: 'Returnable',
        key: 'returnable',
        align: 'center' as 'center',
        render: (_: any, record: OriginalOrderItem) => record.quantity - record.quantityReturned,
    },
    {
      title: 'Qty to Return Now',
      key: 'returnNow',
      render: (_: any, record: OriginalOrderItem, index: number) => {
        const returnableQuantity = record.quantity - record.quantityReturned;
        if (returnableQuantity <= 0) {
          return <Text type="success">Fully Returned</Text>;
        }
        return (
          <Form.Item name={['items', index, 'quantityToReturn']} noStyle>
            <InputNumber min={0} max={returnableQuantity} style={{ width: 80 }} />
          </Form.Item>
        );
      },
    },
    // 👇 THIS IS THE CRUCIAL HIDDEN FIELD THAT WASN'T BEING REGISTERED PROPERLY
    // It must be part of the `columns` array given to the Table.
    {
        key: 'hiddenId',
        dataIndex: 'id', // Maps to OriginalOrderItem.id
        render: (id: string, _: OriginalOrderItem, index: number) => (
            <Form.Item
                name={['items', index, 'originalOrderItemId']}
                initialValue={id} // Set the ID from the record
                hidden // Use AntD's prop to make it invisible but still part of the form
            >
                <Input /> 
            </Form.Item>
        ),
        // Make the column take no space
        width: 0,
        className: 'visually-hidden-column' // Optional CSS class to ensure it's hidden
    }
  ];

  if (!hasRole([Role.ADMIN, Role.MANAGER, Role.CASHIER])) {
    return <Alert message="Access Denied" description="You do not have permission to process returns." type="error" showIcon />;
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Process Sales Return</Title>
      
      <Card title="Step 1: Find Original Order" style={{ marginBottom: 24 }}>
        <Input.Search
          placeholder="Enter original Order ID or Bill Number"
          enterButton={<Button type="primary" icon={<SearchOutlined />}>Find Order</Button>}
          size="large"
          onSearch={handleFindOrder}
          loading={findingOrder}
        />
        {findError && !findingOrder && <Alert message="Error finding order" description={findError.message} type="error" showIcon style={{marginTop: 16}} />}
      </Card>

      {findingOrder && <div style={{textAlign: 'center', padding: 50}}><Spin size="large" /></div>}
      
      {originalOrder && (
        <Card title={`Step 2: Process Return for Order #${originalOrder.billNumber}`}>
          <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleFormValuesChange}>
            <Title level={5}>Items Available for Return</Title>
            <Table
              columns={itemColumns} // 👈 Pass the full columns array here
              dataSource={originalOrder.items}
              rowKey="id"
              pagination={false}
              bordered
              size="small"
            />
            <Divider />
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item name="reason" label="Reason for Return (Optional)">
                  <TextArea rows={4} placeholder="e.g., Damaged item, wrong size, etc." />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} style={{textAlign: 'right'}}>
                <Title level={3}>Total Refund: <Text type="danger">${totalRefund.toFixed(2)}</Text></Title>
                <Space style={{marginTop: 24}}>
                  <Button icon={<ArrowLeftOutlined />} onClick={handleReset} disabled={processingReturn}>
                    Find Another Order
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<UndoOutlined />}
                    loading={processingReturn}
                    disabled={totalRefund <= 0}
                    size="large"
                  >
                    Process Return & Refund
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>
      )}
    </div>
  );
};

export default ReturnsPage;