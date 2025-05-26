import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { Row, Col, Card, List, Button, Select, InputNumber, Typography, message, Spin, Divider, Space } from 'antd';
import { ShoppingCartOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries'; // Assuming this fetches enough detail
import { GET_CUSTOMERS } from '../../apollo/queries/customerQueries'; // For customer selection
import { CREATE_ORDER_MUTATION } from '../../apollo/mutations/orderMutations'; // Define this

const { Title, Text } = Typography;
const { Option } = Select;

// Define this mutation in src/apollo/mutations/orderMutations.ts
// export const CREATE_ORDER_MUTATION = gql`
//   mutation CreateOrder($createOrderInput: CreateOrderInput!) {
//     createOrder(createOrderInput: $createOrderInput) {
//       id
//       totalAmount
//       status
//       customer { id name }
//       items { product { name } quantity }
//     }
//   }
// `;


interface ProductData {
  id: string;
  name: string;
  price: number;
  inventoryItem?: { quantity: number };
  // Add other fields if needed for display
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
  const { data: productsData, loading: productsLoading, error: productsError } = useQuery<{ products: ProductData[] }>(GET_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);

  // For customer search in Select component
  const [fetchCustomers, { data: customersData, loading: customersLoading }] = useLazyQuery<{ customers: CustomerData[] }>(GET_CUSTOMERS);

  const [createOrder, { loading: orderLoading, error: orderError }] = useMutation(CREATE_ORDER_MUTATION, {
    onCompleted: (data) => {
      message.success(`Order #${data.createOrder.id} created successfully! Total: $${data.createOrder.totalAmount.toFixed(2)}`);
      setCart([]);
      setSelectedCustomerId(undefined);
      // TODO: Refetch product inventory or update cache if needed
    },
    onError: (err) => {
      message.error(`Error creating order: ${err.message}`);
    }
  });

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

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCart(prevCart => prevCart.map(item =>
      item.productId === productId
        ? { ...item, quantity: Math.max(0, Math.min(quantity, item.stock)) } // Ensure qty is between 0 and stock
        : item
    ).filter(item => item.quantity > 0)); // Remove item if quantity becomes 0
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      message.error('Cart is empty!');
      return;
    }
    const orderItems = cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
    createOrder({ variables: { createOrderInput: { items: orderItems, customerId: selectedCustomerId } } });
  };


  useEffect(() => {
    // Fetch initial set of customers or when search term changes if implementing server-side search
    fetchCustomers({ variables: { searchTerm: '' } }); // Fetch all initially
  }, [fetchCustomers]);


  if (productsError) message.error(`Error loading products: ${productsError.message}`);
  if (orderError) message.error(`Order submission error: ${orderError.message}`);


  return (
    <Row gutter={16}>
      <Col xs={24} md={14} lg={16}>
        <Title level={3}>Products</Title>
        {productsLoading && <Spin tip="Loading Products..." />}
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl:5, xxl:6 }} // Responsive grid
          dataSource={productsData?.products}
          renderItem={(product) => (
            <List.Item>
              <Card
                hoverable
                title={product.name}
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
                <Text strong>Price: ${product.price.toFixed(2)}</Text><br/>
                <Text type={(product.inventoryItem?.quantity ?? 0) > 0 ? 'success' : 'danger'}>
                  Stock: {product.inventoryItem?.quantity ?? 'N/A'}
                </Text>
              </Card>
            </List.Item>
          )}
        />
      </Col>
      <Col xs={24} md={10} lg={8}>
        <Card title={<Space><ShoppingCartOutlined /> Current Sale</Space>} style={{ position: 'sticky', top: '16px' }}>
          <div style={{ marginBottom: 16 }}>
            <Select
              showSearch
              value={selectedCustomerId}
              placeholder="Select or search customer (Optional)"
              onChange={(value) => setSelectedCustomerId(value)}
              onSearch={(value) => fetchCustomers({ variables: { searchTerm: value }})} // For server-side search
              loading={customersLoading}
              filterOption={(input, option) => // Client-side filtering if server-side not implemented
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              allowClear
            >
              {customersData?.customers.map(customer => (
                <Option key={customer.id} value={customer.id}>{customer.name} ({customer.email || customer.id})</Option>
              ))}
            </Select>
          </div>
          <Divider />
          {cart.length === 0 ? <Text type="secondary">Cart is empty</Text> : (
            <List
              itemLayout="horizontal"
              dataSource={cart}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(item.productId)} />
                  ]}
                >
                  <List.Item.Meta
                    title={item.name}
                    description={`Price: $${item.price.toFixed(2)}`}
                  />
                  <InputNumber
                    min={1}
                    max={item.stock}
                    value={item.quantity}
                    onChange={(value) => handleUpdateCartQuantity(item.productId, value || 0)}
                    size="small"
                    style={{width: '60px', marginRight: '8px'}}
                  />
                  <Text strong>${(item.price * item.quantity).toFixed(2)}</Text>
                </List.Item>
              )}
            />
          )}
          <Divider />
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Title level={4}>Total: ${calculateTotal().toFixed(2)}</Title>
            <Button
              type="primary"
              size="large"
              icon={<ShoppingCartOutlined />}
              onClick={handlePlaceOrder}
              disabled={cart.length === 0 || orderLoading}
              loading={orderLoading}
              style={{width: '100%', marginTop: '10px'}}
            >
              Place Order
            </Button>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default PosInterfacePage;