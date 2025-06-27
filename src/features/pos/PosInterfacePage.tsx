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
  Input,
  Image,
  Switch,
  Dropdown,
  Grid,
} from 'antd';
import { 
    ShoppingCartOutlined, DeleteOutlined, DollarCircleOutlined, TagOutlined, 
    SearchOutlined, EditOutlined, ScheduleOutlined, EllipsisOutlined, MoreOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useReactToPrint } from 'react-to-print';

// Local Imports
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { GET_CUSTOMERS } from '../../apollo/queries/customerQueries';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import { CREATE_ORDER_MUTATION } from '../../apollo/mutations/orderMutations';
import { GET_ORDERS } from '../../apollo/queries/orderQueries';
import PaymentModal, { type PaymentInput } from './PaymentModal';
import Receipt, { type OrderDataForReceipt } from './Receipt';
import { useAuth } from '../../contexts/AuthContext';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { Role } from '../../common/enums/role.enum';
import { DiscountType } from '../../common/enums/discount-type.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';


const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;
const { TextArea } = Input;

// --- Interfaces ---
interface SettingsData { pricesEnteredWithTax: boolean; allowPriceEditAtSale: boolean; allowNegativeStockSale: boolean; displayCurrency?: string; baseCurrency?: string; }
interface ProductData { id: string; name: string; sku?: string; price: number; imageUrls: string[]; inventoryItem?: { quantity: number }; taxes?: { rate: number; name: string; }[]; }
interface CustomerData { id: string; name: string; }
interface CartItem { productId: string; name: string; quantity: number; price: number; stock: number; discountType: DiscountType; discountValue: number; taxRate?: number; priceAtSale: number; }
interface DiscountFormValues { type: DiscountType; value: number; }

// --- Helper Components ---
const PriceEditPopoverContent: React.FC<{ onApply: (newPrice: number) => void; initialValue: number; currencySymbol: string }> = ({ onApply, initialValue, currencySymbol }) => { const [newPrice, setNewPrice] = useState(initialValue); return (<Space><InputNumber value={newPrice} onChange={(val) => setNewPrice(val!)} min={0} precision={2} prefix={currencySymbol} /><Button type="primary" onClick={() => onApply(newPrice)}>Set</Button></Space>);};
const DiscountPopoverContent: React.FC<{ onApply: (values: DiscountFormValues) => void; initialValues: DiscountFormValues; currencySymbol: string; }> = ({ onApply, initialValues, currencySymbol }) => { const [form] = Form.useForm<DiscountFormValues>(); const type = Form.useWatch('type', form); const handleApplyClick = () => { form.validateFields().then(values => onApply(values)); }; return (<Form form={form} layout="vertical" initialValues={initialValues} size="small"><Form.Item name="type" label="Discount Type"><Radio.Group><Radio.Button value={DiscountType.PERCENTAGE}>%</Radio.Button><Radio.Button value={DiscountType.FIXED_AMOUNT}>{currencySymbol}</Radio.Button></Radio.Group></Form.Item><Form.Item name="value" label="Value" rules={[{ required: true }]}><InputNumber min={0} style={{width: '100%'}} prefix={type === DiscountType.FIXED_AMOUNT ? currencySymbol : undefined} /></Form.Item><Button type="primary" onClick={handleApplyClick} block>Apply</Button></Form>);};


const PosInterfacePage: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<{type: DiscountType, value: number}>({ type: DiscountType.NONE, value: 0 });
  const { data: settingsData, loading: settingsLoading } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<OrderDataForReceipt | null>(null);

  const { data: ordersData, loading: ordersLoading, error, refetch } = useQuery(GET_ORDERS);

  const [searchTerm, setSearchTerm] = useState('');
  const [isLayawayMode, setIsLayawayMode] = useState(false);
  
  // --- New State for Additional Order Options ---
  const [orderOptions, setOrderOptions] = useState({
    isFOC: false,
    notes: '',
    deliveryAddress: '',
  });

  const { hasRole } = useAuth();
  const { messageApi } = useAntdNotice();
  const receiptRef = useRef<HTMLDivElement>(null);
  const screens = useBreakpoint(); 

  const handlePrint = useReactToPrint({ contentRef: receiptRef, documentTitle: `Receipt-${lastCompletedOrder?.billNumber}` });

  const currencySymbol = useMemo(() => settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$', [settingsData]);

  const { data: productsData, loading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery<{ products: ProductData[] }>(GET_PRODUCTS);
  const [fetchCustomers, { data: customersData, loading: customersLoading }] = useLazyQuery<{ customers: CustomerData[] }>(GET_CUSTOMERS);
  
  const allowNegativeStockSale = settingsData?.settings.allowNegativeStockSale || false;
  const allowPriceEditAtSale = settingsData?.settings.allowPriceEditAtSale || false;

  const [createOrder, { loading: orderLoading }] = useMutation(CREATE_ORDER_MUTATION, {
    onCompleted: (data) => {
      const newOrderData = data.createOrder as OrderDataForReceipt;
      if (newOrderData.status === 'LAYAWAY') {
        messageApi.success(`Layaway Order #${newOrderData.billNumber} created successfully!`);
      } else if (newOrderData.status === 'FOC') {
        messageApi.success(`FOC Order #${newOrderData.billNumber} created successfully!`);
      } else {
        setLastCompletedOrder(newOrderData);
        setTimeout(() => {
          const printButton = (<Button onClick={handlePrint}>Print Receipt</Button>);
          messageApi.success(<Space><span>{`Order #${newOrderData.billNumber} created!`}</span>{printButton}</Space>, 10);
        }, 100);
      }
      setCart([]);
      setSelectedCustomerId(undefined);
      setIsPaymentModalOpen(false);
      setOrderOptions({ isFOC: false, notes: '', deliveryAddress: '' }); // Reset options
      refetchProducts();
    },
    onError: (err) => messageApi.error(`Error creating order: ${err.message}`)
  });

  const filteredProducts = useMemo(() => {
    if (!productsData?.products) return [];
    if (!searchTerm) return productsData.products;
    const lowercasedTerm = searchTerm.toLowerCase();
    return productsData.products.filter(p => p.name.toLowerCase().includes(lowercasedTerm) || p.sku?.toLowerCase().includes(lowercasedTerm));
  }, [productsData, searchTerm]);

  const pricesEnteredWithTax = settingsData?.settings.pricesEnteredWithTax || false;

  // --- FIX: Updated calculation logic with rounding ---
  const { itemsTotal, totalDiscount, totalTax, grandTotal } = useMemo(() => {
    // Helper function to safely round to 2 decimal places
    const roundToTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

    let currentItemsTotal = 0, currentTotalItemDiscount = 0, currentTotalTax = 0;
    cart.forEach(item => {
      const lineTotal = item.priceAtSale * item.quantity; 
      currentItemsTotal += lineTotal;
      let lineDiscountAmount = 0;
      if (item.discountType === DiscountType.PERCENTAGE) lineDiscountAmount = lineTotal * (item.discountValue / 100);
      else if (item.discountType === DiscountType.FIXED_AMOUNT) lineDiscountAmount = item.discountValue;
      lineDiscountAmount = Math.min(lineDiscountAmount, lineTotal);
      currentTotalItemDiscount += lineDiscountAmount;
      const priceAfterDiscount = lineTotal - lineDiscountAmount;
      const taxRate = item.taxRate;
      if (taxRate && taxRate > 0 && priceAfterDiscount > 0) {
        if (pricesEnteredWithTax) currentTotalTax += priceAfterDiscount - (priceAfterDiscount / (1 + taxRate / 100));
        else currentTotalTax += priceAfterDiscount * (taxRate / 100);
      }
    });
    const subtotalAfterItemDiscounts = currentItemsTotal - currentTotalItemDiscount;
    let cartDiscountAmount = 0;
    if (cartDiscount.type === DiscountType.PERCENTAGE) cartDiscountAmount = subtotalAfterItemDiscounts * (cartDiscount.value / 100);
    else if (cartDiscount.type === DiscountType.FIXED_AMOUNT) cartDiscountAmount = cartDiscount.value;
    cartDiscountAmount = Math.min(cartDiscountAmount, subtotalAfterItemDiscounts);
    const subtotalAfterAllDiscounts = subtotalAfterItemDiscounts - cartDiscountAmount;
    const finalGrandTotal = pricesEnteredWithTax ? subtotalAfterAllDiscounts : subtotalAfterAllDiscounts + currentTotalTax;
    
    // If FOC is toggled, the final total is always 0. Otherwise, round the final value.
    return { 
        itemsTotal: roundToTwo(currentItemsTotal),
        totalDiscount: roundToTwo(currentTotalItemDiscount + cartDiscountAmount),
        totalTax: roundToTwo(currentTotalTax),
        grandTotal: orderOptions.isFOC ? 0 : roundToTwo(finalGrandTotal > 0 ? finalGrandTotal : 0)
    };
  }, [cart, cartDiscount, pricesEnteredWithTax, orderOptions.isFOC]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  
  const handleAddToCart = (product: ProductData) => { const stock = product.inventoryItem?.quantity ?? 0; if (stock <= 0 && !allowNegativeStockSale) { messageApi.warning(`${product.name} is out of stock!`); return; } const totalTaxRate = product.taxes?.reduce((sum, tax) => sum + tax.rate, 0) || 0; setCart((prevCart) => { const existingItem = prevCart.find(item => item.productId === product.id); if (existingItem) { const updatedCart = [...prevCart]; const itemInCart = updatedCart.find(i => i.productId === product.id)!; if (allowNegativeStockSale || itemInCart.quantity < stock) { itemInCart.quantity += 1; } else { messageApi.warning('Maximum stock reached'); } return updatedCart; } return [...prevCart, { productId: product.id, name: product.name, quantity: 1, price: product.price, priceAtSale: product.price, stock: stock, discountType: DiscountType.NONE, discountValue: 0, taxRate: totalTaxRate }]; }); };
  const handleUpdateCartQuantity = (productId: string, quantity: number | null) => { const finalQuantity = quantity === null ? 0 : quantity; setCart(prevCart => prevCart.map(item => item.productId === productId ? { ...item, quantity: finalQuantity > (allowNegativeStockSale ? Infinity : item.stock) ? item.stock : finalQuantity } : item ).filter(item => item.quantity > 0)); };
  const handleRemoveFromCart = (productId: string) => { setCart(prevCart => prevCart.filter(item => item.productId !== productId)); };
  const applyLineItemDiscount = (productId: string, discount: DiscountFormValues) => { setCart(prevCart => prevCart.map(item => item.productId === productId ? { ...item, discountType: discount.type, discountValue: discount.value } : item)); messageApi.success('Item discount applied!'); };
  const applyCartDiscount = (discount: DiscountFormValues) => { setCartDiscount(discount); messageApi.success('Cart discount applied!'); };
  const handlePriceEdit = (productId: string, newPrice: number) => { setCart(cart => cart.map(item => item.productId === productId ? { ...item, priceAtSale: newPrice } : item)); messageApi.success("Price updated for this sale."); };

  // --- Updated Submission and Checkout Logic ---
  const handleProcessPayment = (payments: PaymentInput[]) => {
    createOrder({ variables: { createOrderInput: { 
      items: cart.map(item => ({ productId: item.productId, quantity: item.quantity, priceAtSale: item.priceAtSale, discountType: item.discountType, discountValue: item.discountValue })), 
      customerId: selectedCustomerId, 
      orderDiscountType: cartDiscount.type, 
      orderDiscountValue: cartDiscount.value,
      isLayaway: isLayawayMode,
      isFOC: orderOptions.isFOC,
      notes: orderOptions.notes,
      deliveryAddress: orderOptions.deliveryAddress,
      payments: orderOptions.isFOC ? [{ method: PaymentMethod.CASH, amount: 0 }] : payments,
    }}});
  };

  const handleCheckout = () => {
    if (cart.length === 0) { messageApi.error('Cart is empty!'); return; }
    if (orderOptions.isFOC) {
        handleProcessPayment([]);
    } else {
        setIsPaymentModalOpen(true);
    }
  };

  const moreOptionsContent = (
    <div style={{ width: 280 }}>
        <Form layout="vertical" initialValues={orderOptions} onValuesChange={(_, values) => setOrderOptions(values)}>
            <Form.Item name="isFOC" label="Free of Charge (FOC)" valuePropName="checked">
                <Switch />
            </Form.Item>
            <Form.Item name="deliveryAddress" label="Delivery Address">
                <TextArea rows={3} placeholder="Enter full delivery address..." />
            </Form.Item>
            <Form.Item name="notes" label="Order Notes">
                <TextArea rows={3} placeholder="Add any notes for this order..." />
            </Form.Item>
        </Form>
    </div>
  );

  if (productsError) return <Alert message="Error Loading Products" description={productsError.message} type="error" showIcon />;
  
  const cartListStyle: React.CSSProperties = { minHeight: '150px', ...(screens.lg && { maxHeight: 'calc(100vh - 550px)', overflowY: 'auto', paddingRight: '8px', }), };

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={14} lg={15}>
          <Title level={3}>Point of Sale</Title>
          <Input placeholder="Search products by name or SKU..." prefix={<SearchOutlined />} onChange={(e) => setSearchTerm(e.target.value)} value={searchTerm} allowClear style={{ marginBottom: 16 }} />
          {productsLoading ? <div style={{textAlign: 'center', padding: '50px'}}><Spin tip="Loading Products..." size="large"/></div> : (
            <List grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 5 }} dataSource={filteredProducts} renderItem={(product) => {
              const imageUrl = product.imageUrls && product.imageUrls.length > 0 ? `${import.meta.env.VITE_API_URL}${product.imageUrls[0]}` : null;
              return (
                <List.Item>
                  <Card hoverable cover={ imageUrl ? (<Image alt={product.name} src={imageUrl} style={{ height: 120, objectFit: 'cover' }} preview={false} />) : (<div style={{height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Text type="secondary">No Image</Text></div>) } styles={{ body: { padding: '12px' } }}
                    actions={[ <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => handleAddToCart(product)} disabled={(product.inventoryItem?.quantity ?? 0) <= 0 && !allowNegativeStockSale}>Add</Button> ]}>
                    <Card.Meta title={<Tooltip title={product.name}>{product.name}</Tooltip>} description={ <> <Text strong>{currencySymbol}{product.price.toFixed(2)}</Text> <Text type={(product.inventoryItem?.quantity ?? 0) > 10 ? 'success' : 'warning'} style={{display: 'block'}}>Stock: {product.inventoryItem?.quantity ?? 'N/A'}</Text> </> }/>
                  </Card>
                </List.Item>
              );
            }}/>
          )}
        </Col>
        <Col xs={24} md={10} lg={9}>
          <Card title={<Space><ShoppingCartOutlined /> Current Sale</Space>} style={ screens.md ? { position: 'sticky', top: '16px' } : {}}>
            <Select showSearch value={selectedCustomerId} placeholder="Select a customer (Optional)" onChange={(value) => setSelectedCustomerId(value)} loading={customersLoading} style={{ width: '100%', marginBottom: 16 }} allowClear filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}>
              {customersData?.customers.map((customer) => (<Option key={customer.id} value={customer.id}>{customer.name}</Option>))}
            </Select>
            <Divider style={{margin: '0 0 8px 0'}}/>
            <div style={cartListStyle}>
              {cart.length === 0 ? (<div style={{ paddingTop: '40px' }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Cart is empty" /></div>) : (
                <List dataSource={cart} itemLayout="horizontal" renderItem={(item) => {
                  const itemActions: MenuProps['items'] = [ allowPriceEditAtSale && { key: 'edit-price', label: ( <Popover content={<PriceEditPopoverContent onApply={(newPrice) => handlePriceEdit(item.productId, newPrice)} initialValue={item.priceAtSale} currencySymbol={currencySymbol} />} title="Set Custom Price" trigger="click" placement="left"><Button type="text" icon={<EditOutlined />} block>Edit Price</Button></Popover> )}, { key: 'apply-discount', label: ( <Popover content={ <DiscountPopoverContent onApply={(values) => applyLineItemDiscount(item.productId, values)} initialValues={{ type: item.discountType, value: item.discountValue }} currencySymbol={currencySymbol} /> } title="Apply Item Discount" trigger="click" placement="left"><Button type="text" icon={<TagOutlined />} block>Apply Discount</Button></Popover> )} ].filter(Boolean) as MenuProps['items'];
                  return (
                    <List.Item actions={screens.md ? [ allowPriceEditAtSale && <Popover content={<PriceEditPopoverContent onApply={(newPrice) => handlePriceEdit(item.productId, newPrice)} initialValue={item.priceAtSale} currencySymbol={currencySymbol} />} title="Set Custom Price" trigger="click" placement="left"><Tooltip title="Edit Price"><Button type="text" icon={<EditOutlined />} /></Tooltip></Popover>, <Popover content={<DiscountPopoverContent onApply={(values) => applyLineItemDiscount(item.productId, values)} initialValues={{ type: item.discountType, value: item.discountValue }} currencySymbol={currencySymbol} />} title="Apply Item Discount" trigger="click" placement="left"><Tooltip title="Apply Discount"><Button type="text" icon={<TagOutlined />} /></Tooltip></Popover>, <Tooltip title="Remove Item"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(item.productId)} /></Tooltip>, ] : [ <Dropdown menu={{ items: itemActions }} trigger={['click']}><Button type="text" icon={<EllipsisOutlined />} /></Dropdown>, <Tooltip title="Remove Item"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(item.productId)} /></Tooltip> ]}>
                      <List.Item.Meta title={item.name} description={ <Space wrap> {item.priceAtSale !== item.price ? ( <> <Text delete>{currencySymbol}{item.price.toFixed(2)}</Text> <Text type="success" style={{ marginLeft: 8 }}>{currencySymbol}{item.priceAtSale.toFixed(2)}</Text> </> ) : ( `${currencySymbol}${item.price.toFixed(2)} each` )} {item.taxRate && item.taxRate > 0 && <Tag>{item.taxRate}% tax</Tag>} </Space> } />
                      <Space direction="vertical" align="end" size="small">
                        <InputNumber min={1} max={allowNegativeStockSale ? undefined : item.stock} value={item.quantity} onChange={(value) => handleUpdateCartQuantity(item.productId, value)} size="small" style={{ width: '70px' }} />
                        <Text strong>{currencySymbol}{(item.priceAtSale * item.quantity).toFixed(2)}</Text>
                      </Space>
                    </List.Item>
                  );
                }}/>
              )}
            </div>
            <Divider />
            <div style={{ textAlign: 'right' }}>
              <Row justify="space-between"><Col><Text>Subtotal:</Text></Col><Col><Text>{currencySymbol}{itemsTotal.toFixed(2)}</Text></Col></Row>
              <Row justify="space-between"><Col><Space><Text type="success">Discount:</Text><Popover content={<DiscountPopoverContent onApply={applyCartDiscount} initialValues={cartDiscount} currencySymbol={currencySymbol} />} title="Apply Cart Discount" trigger="click"><Button type="link" icon={<TagOutlined />} size="small" style={{ padding: 0 }}/></Popover></Space></Col><Col><Text type="success">-{currencySymbol}{totalDiscount.toFixed(2)}</Text></Col></Row>
              <Row justify="space-between"><Col><Text>Tax:</Text></Col><Col><Text>{currencySymbol}{totalTax.toFixed(2)}</Text></Col></Row>
              <Divider style={{margin: '8px 0'}}/>
              <Title level={4} style={{margin: 0}}>Total: {currencySymbol}{grandTotal.toFixed(2)}</Title>              
              <Space style={{marginTop: 16}}><Switch checked={isLayawayMode} onChange={setIsLayawayMode} /><Text strong>Save as Layaway</Text></Space>
            </div>
            
            <Space style={{ width: '100%', marginTop: '16px' }} align="end">
                {hasRole([Role.ADMIN, Role.MANAGER]) && (
                    <Popover content={moreOptionsContent} title="Additional Options" trigger="click" placement="topRight">
                        <Button icon={<MoreOutlined />} />
                    </Popover>
                )}
                <Button type="primary" size="large" icon={<DollarCircleOutlined />} onClick={handleCheckout} disabled={cart.length === 0 || orderLoading} style={{ flexGrow: 1 }}>
                    {orderOptions.isFOC ? 'Complete FOC Order' : 'Proceed to Payment'}
                </Button>
            </Space>

          </Card>
        </Col>
      </Row>
      <PaymentModal
        open={!orderOptions.isFOC && isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmountDue={grandTotal}
        onSubmit={handleProcessPayment}
        onOrderCompleted={() => {
          refetch();
        }}
        isProcessing={orderLoading}
        isLayaway={isLayawayMode}
        currencySymbol={currencySymbol}

      />
      <div className="receipt-container-hidden"><div ref={receiptRef} tabIndex={-1}><Receipt order={lastCompletedOrder} /></div></div>
    </>
  );
};

export default PosInterfacePage;
