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
  Tabs,
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

// --- Interfaces (Unchanged) ---
interface SettingsData { pricesEnteredWithTax: boolean; allowPriceEditAtSale: boolean; allowNegativeStockSale: boolean; displayCurrency?: string; baseCurrency?: string; }
interface ProductData { id: string; name: string; sku?: string; price: number; imageUrls: string[]; inventoryItem?: { quantity: number }; taxes?: { rate: number; name: string; }[]; }
interface CustomerData { id: string; name: string; }
interface CartItem { productId: string; name: string; quantity: number; price: number; stock: number; discountType: DiscountType; discountValue: number; taxRate?: number; priceAtSale: number; }
interface DiscountFormValues { type: DiscountType; value: number; }
interface SaleSession { key: string; name: string; cart: CartItem[]; cartDiscount: { type: DiscountType; value: number }; selectedCustomerId?: string; isLayawayMode: boolean; orderOptions: { isFOC: boolean; notes: string; deliveryAddress: string; }; }

// --- Helper Components (Unchanged) ---
const PriceEditPopoverContent: React.FC<{ onApply: (newPrice: number) => void; initialValue: number; currencySymbol: string }> = ({ onApply, initialValue, currencySymbol }) => { const [newPrice, setNewPrice] = useState(initialValue); return (<Space><InputNumber value={newPrice} onChange={(val) => setNewPrice(val!)} min={0} precision={2} prefix={currencySymbol} /><Button type="primary" onClick={() => onApply(newPrice)}>Set</Button></Space>);};
const DiscountPopoverContent: React.FC<{ onApply: (values: DiscountFormValues) => void; initialValues: DiscountFormValues; currencySymbol: string; }> = ({ onApply, initialValues, currencySymbol }) => { const [form] = Form.useForm<DiscountFormValues>(); const type = Form.useWatch('type', form); const handleApplyClick = () => { form.validateFields().then(values => onApply(values)); }; return (<Form form={form} layout="vertical" initialValues={initialValues} size="small"><Form.Item name="type" label="Discount Type"><Radio.Group><Radio.Button value={DiscountType.PERCENTAGE}>%</Radio.Button><Radio.Button value={DiscountType.FIXED_AMOUNT}>{currencySymbol}</Radio.Button></Radio.Group></Form.Item><Form.Item name="value" label="Value" rules={[{ required: true }]}><InputNumber min={0} style={{width: '100%'}} prefix={type === DiscountType.FIXED_AMOUNT ? currencySymbol : undefined} /></Form.Item><Button type="primary" onClick={handleApplyClick} block>Apply</Button></Form>);};

// --- Constants (Unchanged) ---
const INITIAL_PRODUCT_LIMIT = 20;
const PRODUCT_LOAD_INCREMENT = 20;
let saleCounter = 1;
const createNewSession = (): SaleSession => {
    saleCounter++;
    return { key: `sale-${Date.now()}`, name: `Sale ${saleCounter}`, cart: [], cartDiscount: { type: DiscountType.NONE, value: 0 }, isLayawayMode: false, orderOptions: { isFOC: false, notes: '', deliveryAddress: '' }, };
};


const PosInterfacePage: React.FC = () => {
  // --- State Management (Unchanged) ---
  const [sessions, setSessions] = useState<SaleSession[]>([ { key: 'sale-1', name: 'Sale 1', cart: [], cartDiscount: { type: DiscountType.NONE, value: 0 }, isLayawayMode: false, orderOptions: { isFOC: false, notes: '', deliveryAddress: '' } } ]);
  const [activeKey, setActiveKey] = useState<string>('sale-1');
  const { data: settingsData, loading: settingsLoading } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<OrderDataForReceipt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productLimit, setProductLimit] = useState(INITIAL_PRODUCT_LIMIT);
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
  
  // --- FIX: useEffect to handle showing the print receipt message ---
  useEffect(() => {
    if (lastCompletedOrder) {
        const printButton = (<Button onClick={handlePrint}>Print Receipt</Button>);
        messageApi.success(
            <Space>
                <span>{`Order #${lastCompletedOrder.billNumber} created!`}</span>
                {printButton}
            </Space>,
            10 // Notification duration
        );
    }
  }, [lastCompletedOrder, handlePrint, messageApi]);

  const [createOrder, { loading: orderLoading }] = useMutation(CREATE_ORDER_MUTATION, {
    onCompleted: (data) => {
      const newOrderData = data.createOrder as OrderDataForReceipt;
      const completedSessionKey = activeKey; // Capture the key before it changes

      if (newOrderData.status === 'LAYAWAY' || newOrderData.status === 'FOC') {
        messageApi.success(`Order #${newOrderData.billNumber} created successfully!`);
      } else {
        // This will trigger the useEffect above to show the message with the print button
        setLastCompletedOrder(newOrderData); 
      }
      
      setIsPaymentModalOpen(false);
      removeSession(completedSessionKey); // Close the completed tab
      refetchProducts();
    },
    onError: (err) => messageApi.error(`Error creating order: ${err.message}`)
  });

  const activeSession = useMemo(() => sessions.find(s => s.key === activeKey)!, [sessions, activeKey]);

  // --- Logic and Handlers (Unchanged) ---
  const updateActiveSession = (updates: Partial<SaleSession>) => { setSessions(prev => prev.map(s => s.key === activeKey ? { ...s, ...updates } : s)); };
  const updateActiveOrderOptions = (updates: Partial<SaleSession['orderOptions']>) => { updateActiveSession({ orderOptions: { ...activeSession.orderOptions, ...updates } }); };
  const allFilteredProducts = useMemo(() => { if (!productsData?.products) return []; if (!searchTerm) return productsData.products; const lowercasedTerm = searchTerm.toLowerCase(); return productsData.products.filter(p => p.name.toLowerCase().includes(lowercasedTerm) || p.sku?.toLowerCase().includes(lowercasedTerm)); }, [productsData, searchTerm]);
  const paginatedProducts = useMemo(() => { return allFilteredProducts.slice(0, productLimit); }, [allFilteredProducts, productLimit]);
  const pricesEnteredWithTax = settingsData?.settings.pricesEnteredWithTax || false;
  const { itemsTotal, totalDiscount, totalTax, grandTotal } = useMemo(() => { const roundToTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100; if (!activeSession) return { itemsTotal: 0, totalDiscount: 0, totalTax: 0, grandTotal: 0 }; let currentItemsTotal = 0, currentTotalItemDiscount = 0, currentTotalTax = 0; activeSession.cart.forEach(item => { const lineTotal = item.priceAtSale * item.quantity; currentItemsTotal += lineTotal; let lineDiscountAmount = 0; if (item.discountType === DiscountType.PERCENTAGE) lineDiscountAmount = lineTotal * (item.discountValue / 100); else if (item.discountType === DiscountType.FIXED_AMOUNT) lineDiscountAmount = item.discountValue; lineDiscountAmount = Math.min(lineDiscountAmount, lineTotal); currentTotalItemDiscount += lineDiscountAmount; const priceAfterDiscount = lineTotal - lineDiscountAmount; const taxRate = item.taxRate; if (taxRate && taxRate > 0 && priceAfterDiscount > 0) { if (pricesEnteredWithTax) currentTotalTax += priceAfterDiscount - (priceAfterDiscount / (1 + taxRate / 100)); else currentTotalTax += priceAfterDiscount * (taxRate / 100); } }); const subtotalAfterItemDiscounts = currentItemsTotal - currentTotalItemDiscount; let cartDiscountAmount = 0; if (activeSession.cartDiscount.type === DiscountType.PERCENTAGE) cartDiscountAmount = subtotalAfterItemDiscounts * (activeSession.cartDiscount.value / 100); else if (activeSession.cartDiscount.type === DiscountType.FIXED_AMOUNT) cartDiscountAmount = activeSession.cartDiscount.value; cartDiscountAmount = Math.min(cartDiscountAmount, subtotalAfterItemDiscounts); const subtotalAfterAllDiscounts = subtotalAfterItemDiscounts - cartDiscountAmount; const finalGrandTotal = pricesEnteredWithTax ? subtotalAfterAllDiscounts : subtotalAfterAllDiscounts + currentTotalTax; return { itemsTotal: roundToTwo(currentItemsTotal), totalDiscount: roundToTwo(currentTotalItemDiscount + cartDiscountAmount), totalTax: roundToTwo(currentTotalTax), grandTotal: activeSession.orderOptions.isFOC ? 0 : roundToTwo(finalGrandTotal > 0 ? finalGrandTotal : 0) }; }, [activeSession, pricesEnteredWithTax]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  const handleAddToCart = (product: ProductData) => { const stock = product.inventoryItem?.quantity ?? 0; if (stock <= 0 && !allowNegativeStockSale) { messageApi.warning(`${product.name} is out of stock!`); return; } const totalTaxRate = product.taxes?.reduce((sum, tax) => sum + tax.rate, 0) || 0; const newCart = [...activeSession.cart]; const existingItemIndex = newCart.findIndex(item => item.productId === product.id); if (existingItemIndex > -1) { const itemInCart = newCart[existingItemIndex]; if (allowNegativeStockSale || itemInCart.quantity < stock) { newCart[existingItemIndex] = { ...itemInCart, quantity: itemInCart.quantity + 1 }; } else { messageApi.warning('Maximum stock reached'); } } else { newCart.push({ productId: product.id, name: product.name, quantity: 1, price: product.price, priceAtSale: product.price, stock: stock, discountType: DiscountType.NONE, discountValue: 0, taxRate: totalTaxRate }); } updateActiveSession({ cart: newCart }); };
  const handleUpdateCartQuantity = (productId: string, quantity: number | null) => { const finalQuantity = quantity === null ? 0 : quantity; const newCart = activeSession.cart.map(item => item.productId === productId ? { ...item, quantity: finalQuantity > (allowNegativeStockSale ? Infinity : item.stock) ? item.stock : finalQuantity } : item ).filter(item => item.quantity > 0); updateActiveSession({ cart: newCart }); };
  const handleRemoveFromCart = (productId: string) => { updateActiveSession({ cart: activeSession.cart.filter(item => item.productId !== productId) }); };
  const applyLineItemDiscount = (productId: string, discount: DiscountFormValues) => { const newCart = activeSession.cart.map(item => item.productId === productId ? { ...item, discountType: discount.type, discountValue: discount.value } : item); updateActiveSession({ cart: newCart }); messageApi.success('Item discount applied!'); };
  const applyCartDiscount = (discount: DiscountFormValues) => { updateActiveSession({ cartDiscount: discount }); messageApi.success('Cart discount applied!'); };
  const handlePriceEdit = (productId: string, newPrice: number) => { const newCart = activeSession.cart.map(item => item.productId === productId ? { ...item, priceAtSale: newPrice } : item); updateActiveSession({ cart: newCart }); messageApi.success("Price updated for this sale."); };
  const handleProcessPayment = (payments: PaymentInput[]) => { createOrder({ variables: { createOrderInput: { items: activeSession.cart.map(item => ({ productId: item.productId, quantity: item.quantity, priceAtSale: item.priceAtSale, discountType: item.discountType, discountValue: item.discountValue })), customerId: activeSession.selectedCustomerId, orderDiscountType: activeSession.cartDiscount.type, orderDiscountValue: activeSession.cartDiscount.value, isLayaway: activeSession.isLayawayMode, isFOC: activeSession.orderOptions.isFOC, notes: activeSession.orderOptions.notes, deliveryAddress: activeSession.orderOptions.deliveryAddress, payments: activeSession.orderOptions.isFOC ? [{ method: PaymentMethod.CASH, amount: 0 }] : payments, }}}); };
  const handleCheckout = () => { if (activeSession.cart.length === 0) { messageApi.error('Cart is empty!'); return; } if (activeSession.orderOptions.isFOC) { handleProcessPayment([]); } else { setIsPaymentModalOpen(true); } };
  const addSession = () => { const newSession = createNewSession(); setSessions([...sessions, newSession]); setActiveKey(newSession.key); };
  const removeSession = (targetKey: string) => { const newSessions = sessions.filter(s => s.key !== targetKey); if (activeKey === targetKey && newSessions.length > 0) { setActiveKey(newSessions[newSessions.length - 1].key); } if (newSessions.length === 0) { saleCounter = 1; setSessions([{ ...createNewSession(), name: 'Sale 1', key: 'sale-1' }]); setActiveKey('sale-1'); } else { setSessions(newSessions); } };
  const handleTabsEdit = (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => { if (action === 'add') { addSession(); } else { removeSession(targetKey as string); } };
  const moreOptionsContent = ( <div style={{ width: 280 }}> <Form layout="vertical" key={activeSession?.key} initialValues={activeSession?.orderOptions} onValuesChange={(_, values) => updateActiveOrderOptions(values)}> <Form.Item name="isFOC" label="Free of Charge (FOC)" valuePropName="checked"><Switch /></Form.Item> <Form.Item name="deliveryAddress" label="Delivery Address"><TextArea rows={3} placeholder="Enter full delivery address..." /></Form.Item> <Form.Item name="notes" label="Order Notes"><TextArea rows={3} placeholder="Add any notes for this order..." /></Form.Item> </Form> </div> );
  if (productsError) return <Alert message="Error Loading Products" description={productsError.message} type="error" showIcon />;
  const cartListStyle: React.CSSProperties = { minHeight: '150px', ...(screens.lg && { maxHeight: 'calc(100vh - 550px)', overflowY: 'auto', paddingRight: '8px', }), };

  // The content of a single sale tab
  const saleTabNode = (session: SaleSession) => (
      <Card style={{ borderTop: 'none' }}>
        <Select showSearch value={session.selectedCustomerId} placeholder="Select a customer (Optional)" onChange={(value) => updateActiveSession({ selectedCustomerId: value })} loading={customersLoading} style={{ width: '100%', marginBottom: 16 }} allowClear filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}>
          {customersData?.customers.map((customer) => (<Option key={customer.id} value={customer.id}>{customer.name}</Option>))}
        </Select>
        <Divider style={{margin: '0 0 8px 0'}}/>
        <div style={cartListStyle}>
          {session.cart.length === 0 ? (<div style={{ paddingTop: '40px' }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Cart is empty" /></div>) : (
            <List dataSource={session.cart} itemLayout="horizontal" renderItem={(item) => {
              // --- FIX: Restored item actions dropdown for mobile ---
              const itemActionsMenu: MenuProps['items'] = [
                  allowPriceEditAtSale && { key: 'edit-price', label: ( <Popover content={<PriceEditPopoverContent onApply={(newPrice) => handlePriceEdit(item.productId, newPrice)} initialValue={item.priceAtSale} currencySymbol={currencySymbol} />} title="Set Custom Price" trigger="click" placement="left"><Button type="text" icon={<EditOutlined />} block>Edit Price</Button></Popover> )},
                  { key: 'apply-discount', label: ( <Popover content={ <DiscountPopoverContent onApply={(values) => applyLineItemDiscount(item.productId, values)} initialValues={{ type: item.discountType, value: item.discountValue }} currencySymbol={currencySymbol} /> } title="Apply Item Discount" trigger="click" placement="left"><Button type="text" icon={<TagOutlined />} block>Apply Discount</Button></Popover> )}
              ].filter(Boolean) as MenuProps['items'];

              return (
                // --- FIX: Restored the actions prop with full logic ---
                <List.Item
                  actions={!screens.md ? [
                      <Dropdown menu={{ items: itemActionsMenu }} trigger={['click']}><Button type="text" icon={<EllipsisOutlined />} /></Dropdown>,
                      <Tooltip title="Remove Item"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(item.productId)} /></Tooltip>
                  ] : [
                      allowPriceEditAtSale && <Popover content={<PriceEditPopoverContent onApply={(newPrice) => handlePriceEdit(item.productId, newPrice)} initialValue={item.priceAtSale} currencySymbol={currencySymbol} />} title="Set Custom Price" trigger="click" placement="left"><Tooltip title="Edit Price"><Button type="text" icon={<EditOutlined />} /></Tooltip></Popover>,
                      <Popover content={<DiscountPopoverContent onApply={(values) => applyLineItemDiscount(item.productId, values)} initialValues={{ type: item.discountType, value: item.discountValue }} currencySymbol={currencySymbol} />} title="Apply Item Discount" trigger="click" placement="left"><Tooltip title="Apply Discount"><Button type="text" icon={<TagOutlined />} /></Tooltip></Popover>,
                      <Tooltip title="Remove Item"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(item.productId)} /></Tooltip>,
                  ].filter(Boolean)}
                >
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
        <div>
          <Row justify="space-between"><Col><Text>Subtotal:</Text></Col><Col><Text>{currencySymbol}{itemsTotal.toFixed(2)}</Text></Col></Row>
          <Row justify="space-between"><Col><Space><Text type="success">Discount:</Text><Popover content={<DiscountPopoverContent onApply={applyCartDiscount} initialValues={session.cartDiscount} currencySymbol={currencySymbol} />} title="Apply Cart Discount" trigger="click"><Button type="link" icon={<TagOutlined />} size="small" style={{ padding: 0 }}/></Popover></Space></Col><Col><Text type="success">-{currencySymbol}{totalDiscount.toFixed(2)}</Text></Col></Row>
          <Row justify="space-between"><Col><Text>Tax:</Text></Col><Col><Text>{currencySymbol}{totalTax.toFixed(2)}</Text></Col></Row>
          <Divider style={{margin: '8px 0'}}/>
          <Title level={4} style={{margin: 0}}>Total: {currencySymbol}{grandTotal.toFixed(2)}</Title>              
          <Space style={{marginTop: 16}}><Switch checked={session.isLayawayMode} onChange={(checked) => updateActiveSession({ isLayawayMode: checked })} /><Text strong>Save as Layaway</Text></Space>
        </div>
        <Space style={{ width: '100%', marginTop: '16px' }} align="end">
            {hasRole([Role.ADMIN, Role.MANAGER]) && (
                <Popover content={moreOptionsContent} title="Additional Options" trigger="click" placement="topRight">
                    <Button icon={<MoreOutlined />} />
                </Popover>
            )}
            <Button type="primary" size="large" icon={<DollarCircleOutlined />} onClick={handleCheckout} disabled={session.cart.length === 0 || orderLoading} style={{ flexGrow: 1 }}>
                {session.orderOptions.isFOC ? 'Complete FOC Order' : 'Proceed to Payment'}
            </Button>
        </Space>
      </Card>
  );

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={14} lg={15}>
          <Card>
            <Title level={4}>Products</Title>
            <Input placeholder="Search products by name or SKU..." prefix={<SearchOutlined />} onChange={(e) => { setSearchTerm(e.target.value); setProductLimit(INITIAL_PRODUCT_LIMIT); }} value={searchTerm} allowClear style={{ marginBottom: 16 }} />
            {productsLoading ? <div style={{textAlign: 'center', padding: '50px'}}><Spin tip="Loading Products..." size="large"/></div> : (
              <>
                <List grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 5 }} dataSource={paginatedProducts} renderItem={(product) => { const imageUrl = product.imageUrls && product.imageUrls.length > 0 ? `${import.meta.env.VITE_API_URL}${product.imageUrls[0]}` : null; return ( <List.Item> <Card hoverable cover={ imageUrl ? <Image alt={product.name} src={imageUrl} style={{ height: 120, objectFit: 'cover' }} preview={false} /> : <div style={{height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Text type="secondary">No Image</Text></div> } styles={{ body: { padding: '12px' } }} actions={[ <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => handleAddToCart(product)} disabled={!activeSession || ((product.inventoryItem?.quantity ?? 0) <= 0 && !allowNegativeStockSale)}>Add</Button> ]}> <Card.Meta title={<Tooltip title={product.name}>{product.name}</Tooltip>} description={ <> <Text strong>{currencySymbol}{product.price.toFixed(2)}</Text> <Text type={(product.inventoryItem?.quantity ?? 0) > 10 ? 'success' : 'warning'} style={{display: 'block'}}>Stock: {product.inventoryItem?.quantity ?? 'N/A'}</Text> </> }/> </Card> </List.Item> ); }}/>
                {paginatedProducts.length < allFilteredProducts.length && ( <div style={{ textAlign: 'center', marginTop: 24 }}> <Button onClick={() => setProductLimit(prev => prev + PRODUCT_LOAD_INCREMENT)}>Load More Products</Button> </div> )}
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} md={10} lg={9}>
            <Tabs type="editable-card" onChange={setActiveKey} activeKey={activeKey} onEdit={handleTabsEdit} items={sessions.map(s => ({ label: s.name, key: s.key, children: saleTabNode(s), closable: sessions.length > 1, }))} style={ screens.md ? { position: 'sticky', top: '16px' } : {}} />
        </Col>
      </Row>
      <PaymentModal open={activeSession && !activeSession.orderOptions.isFOC && isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} totalAmountDue={grandTotal} onSubmit={handleProcessPayment} isProcessing={orderLoading} isLayaway={activeSession?.isLayawayMode} currencySymbol={currencySymbol} />
      <div className="receipt-container-hidden"><div ref={receiptRef}><Receipt order={lastCompletedOrder} /></div></div>
    </>
  );
};

export default PosInterfacePage;