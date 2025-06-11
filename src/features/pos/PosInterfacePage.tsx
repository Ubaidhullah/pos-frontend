import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Spin,
  Divider,
  Space,
  Tooltip,
  Tag,
  Popover,
  Form,
  Radio,
  Alert,
  Empty,
} from 'antd';
import { ShoppingCartOutlined, DeleteOutlined, DollarCircleOutlined, TagOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
// Local Imports
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { GET_CUSTOMERS } from '../../apollo/queries/customerQueries';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import { CREATE_ORDER_MUTATION } from '../../apollo/mutations/orderMutations';
import PaymentModal, { type PaymentInput } from './PaymentModal';
import Receipt, { type OrderDataForReceipt } from './Receipt';
import { useAuth } from '../../contexts/AuthContext';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { Role } from '../../common/enums/role.enum';
import { DiscountType } from '../../common/enums/discount-type.enum';

const { Title, Text } = Typography;
const { Option } = Select;

// --- Interfaces ---
interface ProductData {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  inventoryItem?: { quantity: number };
  tax?: { rate: number };
}

interface CustomerData {
  id: string;
  name: string;
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  discountType: DiscountType;
  discountValue: number;
  taxRate?: number;
}

interface DiscountFormValues {
  type: DiscountType;
  value: number;
}

// --- Reusable Discount Popover ---
const DiscountPopoverContent: React.FC<{ onApply: (values: DiscountFormValues) => void; initialValues: DiscountFormValues }> = ({ onApply, initialValues }) => {
    const [form] = Form.useForm<DiscountFormValues>();
    const handleApplyClick = () => { form.validateFields().then(values => onApply(values)); };
    return (
        <Form form={form} layout="vertical" initialValues={initialValues} size="small">
            <Form.Item name="type" label="Discount Type"><Radio.Group><Radio.Button value={DiscountType.PERCENTAGE}>%</Radio.Button><Radio.Button value={DiscountType.FIXED_AMOUNT}>$</Radio.Button></Radio.Group></Form.Item>
            <Form.Item name="value" label="Value" rules={[{ required: true }]}><InputNumber min={0} style={{width: '100%'}} /></Form.Item>
            <Button type="primary" onClick={handleApplyClick} block>Apply</Button>
        </Form>
    );
};


const PosInterfacePage: React.FC = () => {
  // --- State Management ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<{type: DiscountType, value: number}>({ type: DiscountType.NONE, value: 0 });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<OrderDataForReceipt | null>(null);

  // --- Refs & Hooks ---
  const { hasRole } = useAuth();
  const { messageApi } = useAntdNotice();
  const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
      contentRef: receiptRef,
      documentTitle: `Receipt-${lastCompletedOrder?.billNumber}`,
      onAfterPrint: () => receiptRef.current?.focus(),
    });

  // --- GraphQL Operations ---
  const { data: settingsData } = useQuery<{ settings: { pricesEnteredWithTax: boolean } }>(GET_SETTINGS);
  const { data: productsData, loading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery<{ products: ProductData[] }>(GET_PRODUCTS);
  const [fetchCustomers, { data: customersData, loading: customersLoading }] = useLazyQuery<{ customers: CustomerData[] }>(GET_CUSTOMERS);
  
  const [createOrder, { loading: orderLoading }] = useMutation(CREATE_ORDER_MUTATION, {
    onCompleted: (data) => {
      const newOrderData = data.createOrder as OrderDataForReceipt;
      setLastCompletedOrder(newOrderData);
      console.log('Receipt Order:', lastCompletedOrder);
      setTimeout(() => {
        const printButton = (<Button onClick={handlePrint}>Print Receipt</Button>);
        messageApi.success(<Space><span>{`Order #${newOrderData.billNumber} created!`}</span>{printButton}</Space>, 10);
      }, 100);

      setCart([]);
      setSelectedCustomerId(undefined);
      setIsPaymentModalOpen(false);
      refetchProducts();
    },
    onError: (err) => {
      messageApi.error(`Error creating order: ${err.message}`);
    }
  });

  const pricesEnteredWithTax = settingsData?.settings.pricesEnteredWithTax || false;

  const { itemsTotal, totalDiscount, totalTax, grandTotal } = useMemo(() => {
    let currentItemsTotal = 0;
    let currentTotalItemDiscount = 0;
    let currentTotalTax = 0;
    cart.forEach(item => {
      const lineTotal = item.price * item.quantity;
      currentItemsTotal += lineTotal;
      let lineDiscountAmount = 0;
      if (item.discountType === DiscountType.PERCENTAGE) lineDiscountAmount = lineTotal * (item.discountValue / 100);
      else if (item.discountType === DiscountType.FIXED_AMOUNT) lineDiscountAmount = item.discountValue;
      lineDiscountAmount = Math.min(lineDiscountAmount, lineTotal);
      currentTotalItemDiscount += lineDiscountAmount;
      const priceAfterDiscount = lineTotal - lineDiscountAmount;
      let lineTaxAmount = 0;
      const taxRate = item.taxRate;
      if (taxRate && taxRate > 0) {
        if (pricesEnteredWithTax) lineTaxAmount = priceAfterDiscount - (priceAfterDiscount / (1 + taxRate / 100));
        else lineTaxAmount = priceAfterDiscount * (taxRate / 100);
      }
      currentTotalTax += lineTaxAmount;
    });
    const subtotalAfterItemDiscounts = currentItemsTotal - currentTotalItemDiscount;
    let cartDiscountAmount = 0;
    if (cartDiscount.type === DiscountType.PERCENTAGE) cartDiscountAmount = subtotalAfterItemDiscounts * (cartDiscount.value / 100);
    else if (cartDiscount.type === DiscountType.FIXED_AMOUNT) cartDiscountAmount = cartDiscount.value;
    cartDiscountAmount = Math.min(cartDiscountAmount, subtotalAfterItemDiscounts);
    const subtotalAfterAllDiscounts = subtotalAfterItemDiscounts - cartDiscountAmount;
    const finalGrandTotal = subtotalAfterAllDiscounts + currentTotalTax;
    return {
      itemsTotal: currentItemsTotal,
      totalDiscount: currentTotalItemDiscount + cartDiscountAmount,
      totalTax: currentTotalTax,
      grandTotal: finalGrandTotal > 0 ? finalGrandTotal : 0,
    };
  }, [cart, cartDiscount, pricesEnteredWithTax]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleAddToCart = (product: ProductData) => {
    if ((product.inventoryItem?.quantity ?? 0) <= 0) { messageApi.warning(`${product.name} is out of stock!`); return; }
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        const updatedCart = [...prevCart];
        const itemInCart = updatedCart.find(i => i.productId === product.id)!;
        if(itemInCart.quantity < (product.inventoryItem?.quantity ?? 0)) itemInCart.quantity += 1;
        else messageApi.warning('Maximum stock reached');
        return updatedCart;
      }
      return [...prevCart, {
        productId: product.id, name: product.name, quantity: 1, price: product.price,
        stock: product.inventoryItem?.quantity ?? 0,
        discountType: DiscountType.NONE, discountValue: 0,
        taxRate: product.tax?.rate || 0,
      }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number | null) => {
    const finalQuantity = quantity === null ? 0 : quantity;
    setCart(prevCart => prevCart.map(item =>
      item.productId === productId ? { ...item, quantity: Math.max(0, Math.min(finalQuantity, item.stock)) } : item
    ).filter(item => item.quantity > 0));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const applyLineItemDiscount = (productId: string, discount: DiscountFormValues) => {
    setCart(prevCart => prevCart.map(item => 
      item.productId === productId ? { ...item, discountType: discount.type, discountValue: discount.value } : item
    ));
    messageApi.success('Item discount applied!');
  };

  const applyCartDiscount = (discount: DiscountFormValues) => {
    setCartDiscount(discount);
    messageApi.success('Cart discount applied!');
  };

  const handleCheckout = () => {
    if (cart.length === 0) { messageApi.error('Cart is empty!'); return; }
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = (payments: PaymentInput[]) => {
    createOrder({ variables: { createOrderInput: {
      items: cart.map(item => ({ productId: item.productId, quantity: item.quantity, priceAtSale: item.price, discountType: item.discountType, discountValue: item.discountValue })),
      payments, customerId: selectedCustomerId, orderDiscountType: cartDiscount.type, orderDiscountValue: cartDiscount.value,
    }}});
  };

  if (productsError) return <Alert message="Error Loading Products" description={productsError.message} type="error" showIcon />;

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
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
                    styles={{ body: { padding: '12px' } }}
                    actions={[
                      <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => handleAddToCart(product)} disabled={(product.inventoryItem?.quantity ?? 0) <= 0}>Add</Button>
                    ]}
                  >
                    <Card.Meta title={<Tooltip title={product.name}>{product.name}</Tooltip>} description={
                      <>
                        <Text strong>${product.price.toFixed(2)}</Text>
                        <Text type={(product.inventoryItem?.quantity ?? 0) > 10 ? 'success' : 'warning'} style={{display: 'block'}}>Stock: {product.inventoryItem?.quantity ?? 'N/A'}</Text>
                      </>
                    }/>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Col>
        <Col xs={24} lg={9}>
          <Card title={<Space><ShoppingCartOutlined /> Current Sale</Space>} style={{ position: 'sticky', top: '16px' }}>
            <Select showSearch value={selectedCustomerId} placeholder="Select a customer (Optional)" onChange={(value) => setSelectedCustomerId(value)} loading={customersLoading} style={{ width: '100%', marginBottom: 16 }} allowClear filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}>
              {customersData?.customers.map((customer) => (<Option key={customer.id} value={customer.id}>{customer.name}</Option>))}
            </Select>
            <Divider style={{margin: '0 0 8px 0'}}/>
            {/* Cart List */}
            <div style={{ maxHeight: 'calc(100vh - 520px)', minHeight: 150, overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <div style={{ paddingTop: '40px' }}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Cart is empty" />
                </div>
              ) : (
                <List
                  dataSource={cart}
                  itemLayout="horizontal"
                  renderItem={(item) => {
                    const lineTotal = item.price * item.quantity;
                    
                    let lineDiscountAmount = 0;
                    if (item.discountType === DiscountType.PERCENTAGE) {
                        lineDiscountAmount = lineTotal * (item.discountValue / 100);
                    } else if (item.discountType === DiscountType.FIXED_AMOUNT) {
                        lineDiscountAmount = item.discountValue;
                    }
                    // Ensure discount is not more than the line total
                    lineDiscountAmount = Math.min(lineDiscountAmount, lineTotal);

                    const priceAfterDiscount = lineTotal - lineDiscountAmount;
                    
                    let lineTaxAmount = 0;
                    if (item.taxRate && item.taxRate > 0) {
                        if (pricesEnteredWithTax) {
                            // Back-calculate tax from an inclusive price
                            const taxableBase = priceAfterDiscount / (1 + item.taxRate / 100);
                            lineTaxAmount = priceAfterDiscount - taxableBase;
                        } else {
                            // Add tax on top of an exclusive price
                            lineTaxAmount = priceAfterDiscount * (item.taxRate / 100);
                        }
                    }

                    const finalLineTotal = priceAfterDiscount + (pricesEnteredWithTax ? 0 : lineTaxAmount);

                    return (
                      <List.Item
                        actions={[
                          <Popover
                            content={
                              <DiscountPopoverContent
                                onApply={(values) => applyLineItemDiscount(item.productId, values)}
                                initialValues={{ type: item.discountType, value: item.discountValue }}
                              />
                            }
                            title="Apply Item Discount"
                            trigger="click"
                            placement="left"
                          >
                            <Tooltip title="Apply Discount">
                              <Button type="text" icon={<TagOutlined />} />
                            </Tooltip>
                          </Popover>,
                          <Tooltip title="Remove Item">
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveFromCart(item.productId)}
                            />
                          </Tooltip>,
                        ]}
                      >
                        <List.Item.Meta
                          title={item.name}
                          description={
                            <>
                              {item.discountType !== DiscountType.NONE ? (
                                <Text delete>${item.price.toFixed(2)}</Text>
                              ) : (
                                `$${item.price.toFixed(2)} each`
                              )}
                              {item.taxRate && item.taxRate > 0 && (
                                <Tag style={{ marginLeft: 8 }}>{item.taxRate}% tax</Tag>
                              )}
                            </>
                          }
                        />
                        <Space direction="vertical" align="end" size="small">
                          <InputNumber
                            min={1}
                            max={item.stock}
                            value={item.quantity}
                            onChange={(value) => handleUpdateCartQuantity(item.productId, value)}
                            size="small"
                            style={{ width: '70px' }}
                          />
                          {item.discountType !== DiscountType.NONE && (
                            <Tag color="green">Disc: -${lineDiscountAmount.toFixed(2)}</Tag>
                          )}
                          <Text strong>${finalLineTotal.toFixed(2)}</Text>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              )}
            </div>
            <Divider />
            <div style={{ textAlign: 'right' }}>
              <Row justify="space-between"><Col><Text>Subtotal:</Text></Col><Col><Text>${itemsTotal.toFixed(2)}</Text></Col></Row>
              <Row justify="space-between"><Col><Space><Text type="success">Discount:</Text><Popover content={<DiscountPopoverContent onApply={applyCartDiscount} initialValues={cartDiscount} />} title="Apply Cart Discount" trigger="click"><Button type="link" icon={<TagOutlined />} size="small" style={{ padding: 0 }}/></Popover></Space></Col><Col><Text type="success">-${totalDiscount.toFixed(2)}</Text></Col></Row>
              <Row justify="space-between"><Col><Text>Tax:</Text></Col><Col><Text>${totalTax.toFixed(2)}</Text></Col></Row>
              <Divider style={{margin: '8px 0'}}/>
              <Title level={4} style={{margin: 0}}>Total: ${grandTotal.toFixed(2)}</Title>
              <Button type="primary" size="large" icon={<DollarCircleOutlined />} onClick={handleCheckout} disabled={cart.length === 0 || orderLoading} style={{ width: '100%', marginTop: '10px' }}>Proceed to Payment</Button>
            </div>
          </Card>
        </Col>
      </Row>

      <PaymentModal open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} totalAmountDue={grandTotal} onSubmit={handleProcessPayment} isProcessing={orderLoading} />
      
      <div className="receipt-container-hidden">
        <div ref={receiptRef} tabIndex={-1}>
          <Receipt order={lastCompletedOrder} />
        </div>
      </div>

    </>
  );
};

export default PosInterfacePage;
