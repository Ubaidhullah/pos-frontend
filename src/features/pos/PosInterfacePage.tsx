import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  Row,
  Col,
  Card,
  List,
  Button,
  Select,
  InputNumber,
  Typography,
  message,
  Spin,
  Divider,
  Space,
  Tooltip,
} from 'antd';
import { ShoppingCartOutlined, DeleteOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';

// Local Imports
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { GET_CUSTOMERS } from '../../apollo/queries/customerQueries';
import { CREATE_ORDER_MUTATION } from '../../apollo/mutations/orderMutations'; // Ensure this file is created
import PaymentModal, { type PaymentInput } from './PaymentModal';
import Receipt, { type OrderDataForReceipt } from './Receipt';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext'; 


const { Title, Text } = Typography;
const { Option } = Select;

// --- Interfaces for data types ---
interface ProductData {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  inventoryItem?: { quantity: number; };
}

interface CustomerData {
  id: string;
  name: string;
  email?: string;
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  stock: number;
}


const PosInterfacePage: React.FC = () => {
  // --- State Management ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<OrderDataForReceipt | null>(null);
  const { messageApi } = useAntdNotice(); 

  // --- Refs and Hooks ---
  const { hasRole } = useAuth(); // Assuming useAuth provides role checking
    const contentRef = useRef<HTMLDivElement>(null);

  // ✅ Pass the ref object directly
  const handlePrint = useReactToPrint({
  contentRef,  
  documentTitle: `Receipt_${lastCompletedOrder?.billNumber}`,
});





  // --- GraphQL Operations ---
  const { data: productsData, loading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery<{ products: ProductData[] }>(GET_PRODUCTS);
  const [fetchCustomers, { data: customersData, loading: customersLoading }] = useLazyQuery<{ customers: CustomerData[] }>(GET_CUSTOMERS);
  
  const [createOrder, { loading: orderLoading }] = useMutation(CREATE_ORDER_MUTATION, {
    onCompleted: (data) => {
      // Step 1: Get the completed order data from the mutation response
      const newOrderData = data.createOrder as OrderDataForReceipt;
      
      // Step 2: Save this data to state. This will trigger a re-render.
      setLastCompletedOrder(newOrderData);

      // Step 3: Use a small delay. This is crucial! It gives React a moment
      // to re-render the hidden <Receipt> component with the new order data
      // before we try to print it.
      setTimeout(() => {
        // Step 4: Define the print button as a React element
        const printButton = (
          <Button type="primary" onClick={() => handlePrint()}>
            Print Receipt
          </Button>
        );
        
        // Step 5: Display the success message, embedding the button element
        messageApi.success(
          <Space>
            <span>{`Order #${newOrderData.billNumber} created! Change: $${newOrderData.changeGiven.toFixed(2)}`}</span>
            {printButton}
          </Space>,
          10 // Keep the message box open for 10 seconds to allow clicking the button
        );
      }, 500); // A 500ms delay is usually sufficient

      // Step 6: Reset the POS interface for the next sale
      setCart([]);
      setSelectedCustomerId(undefined);
      setIsPaymentModalOpen(false);
      refetchProducts();
    },
    onError: (err) => {
      messageApi.error(`Error creating order: ${err.message}`);
    }
  });

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // --- Cart Management Functions ---
  const handleAddToCart = (product: ProductData) => {
    if ((product.inventoryItem?.quantity ?? 0) <= 0) {
      message.warning(`${product.name} is out of stock!`);
      return;
    }
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(item => item.productId === product.id);
      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        if (updatedCart[existingItemIndex].quantity < (product.inventoryItem?.quantity ?? 0)) {
          updatedCart[existingItemIndex].quantity += 1;
        } else {
          message.warning(`Cannot add more ${product.name}. Maximum stock reached.`);
        }
        return updatedCart;
      }
      return [...prevCart, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        stock: product.inventoryItem?.quantity ?? 0
      }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number | null) => {
    const finalQuantity = quantity === null ? 0 : quantity;
    setCart(prevCart => prevCart.map(item =>
      item.productId === productId
        ? { ...item, quantity: Math.max(0, Math.min(finalQuantity, item.stock)) }
        : item
    ).filter(item => item.quantity > 0)); // Remove item if quantity becomes 0
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  // --- Checkout Flow Functions ---
  const handleCheckout = () => {
    if (cart.length === 0) {
      message.error('Cart is empty!');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = (payments: PaymentInput[]) => {
    const orderItems = cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      priceAtSale: item.price,
    }));

    createOrder({
      variables: {
        createOrderInput: {
          items: orderItems,
          payments: payments,
          customerId: selectedCustomerId,
        }
      }
    });
  };

  if (productsError) message.error(`Error loading products: ${productsError.message}`);

  return (
    <>
      <Row gutter={[16, 16]}>
        {/* Product Selection Column */}
        <Col xs={24} md={14} lg={16}>
          <Title level={3}>Point of Sale</Title>
          {productsLoading ? <div style={{textAlign: 'center', padding: '50px'}}><Spin tip="Loading Products..." size="large"/></div> : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
              dataSource={productsData?.products}
              renderItem={(product) => (
                <List.Item>
                  <Card
                    hoverable
                    cover={product.imageUrl ? <img alt={product.name} src={product.imageUrl} style={{height: 120, objectFit: 'cover'}}/> : <div style={{height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Text type="secondary">No Image</Text></div>}
                    bodyStyle={{padding: '12px'}}
                    actions={[
                      <Button
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        onClick={() => handleAddToCart(product)}
                        disabled={(product.inventoryItem?.quantity ?? 0) <= 0}
                      >
                        Add
                      </Button>
                    ]}
                  >
                    <Card.Meta
                      title={<Tooltip title={product.name}>{product.name}</Tooltip>}
                      description={
                          <>
                            <Text strong>${product.price.toFixed(2)}</Text><br/>
                            <Text type={(product.inventoryItem?.quantity ?? 0) > 10 ? 'success' : 'warning'}>
                              Stock: {product.inventoryItem?.quantity ?? 'N/A'}
                            </Text>
                          </>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Col>

        {/* Current Sale / Cart Column */}
        <Col xs={24} md={10} lg={8}>
          <Card title={<Space><ShoppingCartOutlined /> Current Sale</Space>} style={{ position: 'sticky', top: '16px' }}>
            <Select
              showSearch
              value={selectedCustomerId}
              placeholder="Select or search customer (Optional)"
              onChange={(value) => setSelectedCustomerId(value)}
              loading={customersLoading}
              style={{ width: '100%', marginBottom: 16 }}
              allowClear
              filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}
            >
              {customersData?.customers.map(customer => <Option key={customer.id} value={customer.id}>{customer.name}</Option>)}
            </Select>
            <Divider />

            <div style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
              {cart.length === 0 ? <Text type="secondary" style={{display: 'block', textAlign: 'center', padding: '20px'}}>Cart is empty.</Text> : (
                <List
                  itemLayout="horizontal"
                  dataSource={cart}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Tooltip title="Remove Item">
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(item.productId)} />
                        </Tooltip>
                      ]}
                    >
                      <List.Item.Meta
                        title={item.name}
                        description={`$${item.price.toFixed(2)} each`}
                      />
                      <Space direction="vertical" align="end" size="small">
                        <InputNumber
                            min={1}
                            max={item.stock}
                            value={item.quantity}
                            onChange={(value) => handleUpdateCartQuantity(item.productId, value)}
                            size="small"
                            style={{width: '70px'}}
                        />
                         <Text strong>${(item.price * item.quantity).toFixed(2)}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </div>

            <Divider />
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Title level={4} style={{margin: 0}}>Total: ${calculateTotal().toFixed(2)}</Title>
              <Button
                type="primary"
                size="large"
                icon={<DollarCircleOutlined />}
                onClick={handleCheckout}
                disabled={cart.length === 0 || orderLoading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                Proceed to Payment
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Payment Modal */}
      <PaymentModal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmountDue={calculateTotal()}
        onSubmit={handleProcessPayment}
        isProcessing={orderLoading}
      />

      {/* Hidden Receipt Component for Printing */}
      <div className="receipt-container-hidden">
        <div ref={contentRef} tabIndex={-1}>
          <Receipt order={lastCompletedOrder} />
        </div>
      </div>
    </>
  );
};

export default PosInterfacePage;