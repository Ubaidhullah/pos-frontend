import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import {
  Form, Input, InputNumber, Button, Select, DatePicker, Space, Card, Row, Col, Typography,
  Divider, message, Spin, Empty, Alert, Grid
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// --- Local Imports ---
import { GET_SUPPLIERS } from '../../apollo/queries/supplierQueries';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries';
import { GET_PURCHASE_ORDER_BY_ID, GET_PURCHASE_ORDERS } from '../../apollo/queries/purchaseOrderQueries';
import { CREATE_PURCHASE_ORDER, UPDATE_DRAFT_PURCHASE_ORDER } from '../../apollo/mutations/purchaseOrderMutations';
import { PurchaseOrderStatus } from '../../common/enums/purchase-order-status.enum';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';

// Import the modals we will trigger
import SupplierFormModal, { type SupplierToEdit } from '../suppliers/SupplierFormModal';
import ProductFormModal, { type ProductToEdit } from '../products/ProductForm';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

// --- Interfaces for Form Data ---
interface SupplierInfo { id: string; name: string; }
interface ProductInfo { id: string; name: string; sku?: string; }
interface POItemFormValue { productId?: string; quantityOrdered?: number; unitCost?: number; }
interface LandedCostFormValue { name?: string; amount?: number; }
interface PurchaseOrderFormValues {
  supplierId?: string;
  orderDate?: dayjs.Dayjs;
  expectedDeliveryDate?: dayjs.Dayjs;
  notes?: string;
  items: POItemFormValue[];
  landingCosts?: LandedCostFormValue[];
}

interface SettingsInfo {
  displayCurrency?: string;
  baseCurrency?: string;
}

const PurchaseOrderFormPage: React.FC = () => {
  const { id: poId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<PurchaseOrderFormValues>();
  const { hasRole } = useAuth();
  const { messageApi } = useAntdNotice();
  const screens = useBreakpoint();

  const isEditMode = !!poId;
  const [currentPoStatus, setCurrentPoStatus] = useState<PurchaseOrderStatus | null>(null);
  const [overallTotal, setOverallTotal] = useState<number>(0);
  const { data: settingsData } = useQuery<{ settings: SettingsInfo }>(GET_SETTINGS);
  
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const { data: suppliersData, loading: suppliersLoading, refetch: refetchSuppliers } = useQuery<{ suppliers: SupplierInfo[] }>(GET_SUPPLIERS);
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useQuery<{ products: ProductInfo[] }>(GET_PRODUCTS);
  const [fetchPO, { data: poData, loading: poLoading, error: poError }] = useLazyQuery(GET_PURCHASE_ORDER_BY_ID);

  const currencySymbol = useMemo(() => {
          return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
        }, [settingsData]);

  const [createPO, { loading: createLoading }] = useMutation(CREATE_PURCHASE_ORDER);
  const [updateDraftPO, { loading: updateLoading }] = useMutation(UPDATE_DRAFT_PURCHASE_ORDER);

  useEffect(() => { if (isEditMode && poId) fetchPO({ variables: { id: poId } }); }, [isEditMode, poId, fetchPO]);

  // --- FIX: The `calculateOverallTotal` function is now more robust. ---
  // It ensures that `items` and `landingCosts` are always treated as arrays, preventing the .reduce() error.
  const calculateOverallTotal = useCallback((items: any, landingCosts: any) => {
    const safeItems = Array.isArray(items) ? items : [];
    const safeLandingCosts = Array.isArray(landingCosts) ? landingCosts : [];

    const itemsTotal = safeItems.reduce((sum, item) => sum + (Number(item?.quantityOrdered) || 0) * (Number(item?.unitCost) || 0), 0);
    const landedCostsTotal = safeLandingCosts.reduce((sum, cost) => sum + (Number(cost?.amount) || 0), 0);
    
    setOverallTotal(itemsTotal + landedCostsTotal);
  }, []);

  useEffect(() => {
    if (isEditMode && poData?.purchaseOrder) {
      const { purchaseOrder } = poData;
      setCurrentPoStatus(purchaseOrder.status as PurchaseOrderStatus);
      
      // --- FIX: Logic to safely parse landingCosts from a string if necessary ---
      let parsedLandingCosts = [];
      if (typeof purchaseOrder.landingCosts === 'string') {
        try {
          parsedLandingCosts = JSON.parse(purchaseOrder.landingCosts);
        } catch (e) {
          console.error("Failed to parse landingCosts JSON string:", e);
          // Keep it as an empty array if parsing fails
        }
      } else if (Array.isArray(purchaseOrder.landingCosts)) {
        parsedLandingCosts = purchaseOrder.landingCosts;
      }

      const formData = {
        ...purchaseOrder,
        orderDate: dayjs(purchaseOrder.orderDate),
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ? dayjs(purchaseOrder.expectedDeliveryDate) : undefined,
        items: purchaseOrder.items.map((item: any) => ({ productId: item.productId, quantityOrdered: item.quantityOrdered, unitCost: item.unitCost })),
        landingCosts: parsedLandingCosts,
      };

      form.setFieldsValue(formData);
      calculateOverallTotal(formData.items, formData.landingCosts);
    } else if (!isEditMode) {
      const initialValues = { orderDate: dayjs(), items: [{ productId: undefined, quantityOrdered: 1, unitCost: 0 }], landingCosts: [] };
      form.setFieldsValue(initialValues);
      calculateOverallTotal(initialValues.items, initialValues.landingCosts);
    }
  }, [isEditMode, poData, form, calculateOverallTotal]);

  const handleFormValuesChange = (_: any, allValues: PurchaseOrderFormValues) => {
    calculateOverallTotal(allValues.items, allValues.landingCosts);
  };

  const onFinish = async (values: PurchaseOrderFormValues) => {
    if (isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT) {
        messageApi.error(`Only DRAFT POs can be modified.`);
        return;
    }
    const submissionInput = {
      supplierId: values.supplierId,
      orderDate: values.orderDate?.toISOString(),
      expectedDeliveryDate: values.expectedDeliveryDate?.toISOString(),
      notes: values.notes,
      items: values.items.filter(item => item.productId && (item.quantityOrdered || 0) > 0).map(item => ({
        productId: item.productId!,
        quantityOrdered: Number(item.quantityOrdered),
        unitCost: Number(item.unitCost),
      })),
      landingCosts: values.landingCosts?.filter(cost => cost.name && (cost.amount || 0) > 0) || [],
    };
    if (submissionInput.items.length === 0) { messageApi.error('A PO must have at least one valid item.'); return; }

    try {
      if (isEditMode && poId) {
        await updateDraftPO({ variables: { id: poId, updatePurchaseOrderInput: submissionInput }, refetchQueries: [{ query: GET_PURCHASE_ORDER_BY_ID, variables: { id: poId } }] });
        messageApi.success('Purchase Order updated successfully!');
      } else {
        const result = await createPO({ variables: { createPurchaseOrderInput: submissionInput }, refetchQueries: [{ query: GET_PURCHASE_ORDERS }] });
        messageApi.success(`Purchase Order ${result.data?.createPurchaseOrder?.poNumber || ''} created successfully!`);
      }
      navigate('/admin/purchase-orders');
    } catch (err: any) {
      messageApi.error(`Failed to save PO: ${err.message}`);
    }
  };

  if (poLoading && isEditMode) return <div style={{textAlign: 'center', padding: '50px'}}><Spin size="large" tip="Loading Purchase Order..."/></div>;
  if (poError && isEditMode) return <Alert message="Error" description={`Failed to load PO: ${poError.message}`} type="error" showIcon />;
  if (!hasRole([Role.ADMIN, Role.MANAGER])) return <Alert message="Access Denied" type="error" showIcon />;

  const formIsDisabled = isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT;

  return (
    <>
      <div style={{ padding: screens.md ? '24px' : '12px' }}>
        <Space style={{ marginBottom: 24 }}><Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/purchase-orders')}>Back to List</Button><Title level={2} style={{ margin: 0 }}>{isEditMode ? `Edit Purchase Order` : 'Create New Purchase Order'}</Title></Space>
        
        <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleFormValuesChange}>
          <Card title="PO Details">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Form.Item name="supplierId" label="Supplier" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Select a supplier" loading={suppliersLoading} disabled={formIsDisabled} dropdownRender={(menu) => ( <> {menu} <Divider style={{ margin: '8px 0' }} /> <Button type="link" icon={<PlusOutlined />} onClick={() => setIsSupplierModalOpen(true)}>Create New Supplier</Button> </> )}>
                    {suppliersData?.suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}><Form.Item name="orderDate" label="Order Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled={formIsDisabled} /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="expectedDeliveryDate" label="Expected Delivery Date"><DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled={formIsDisabled} /></Form.Item></Col>
              <Col xs={24}><Form.Item name="notes" label="Notes / Remarks"><TextArea rows={2} disabled={formIsDisabled}/></Form.Item></Col>
            </Row>
          </Card>

          <Card title="Items to Purchase" style={{marginTop: 24}}>
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <Card key={key} size="small" style={{ marginBottom: 16, background: '#fafafa' }}
                        extra={!formIsDisabled && <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />}
                    >
                        <Row gutter={[16, 8]}>
                            <Col xs={24}><Form.Item {...restField} name={[name, 'productId']} label="Product" rules={[{ required: true }]}><Select showSearch placeholder="Select product" loading={productsLoading} disabled={formIsDisabled} filterOption={(input, option) => (option?.children as any)?.toLowerCase().includes(input.toLowerCase())}>{productsData?.products.map(p => <Option key={p.id} value={p.id}>{p.name} (SKU: {p.sku || 'N/A'})</Option>)}</Select></Form.Item></Col>
                            <Col xs={12} sm={8}><Form.Item {...restField} name={[name, 'quantityOrdered']} label="Qty" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} disabled={formIsDisabled} /></Form.Item></Col>
                            <Col xs={12} sm={8}><Form.Item {...restField} name={[name, 'unitCost']} label="Unit Cost" rules={[{ required: true }]}><InputNumber addonBefore={currencySymbol} style={{ width: '100%' }} min={0} precision={2} disabled={formIsDisabled} /></Form.Item></Col>
                            <Col xs={24} sm={8}><Form.Item label="Subtotal"><Text strong>{currencySymbol}{((form.getFieldValue(['items', name, 'quantityOrdered']) || 0) * (form.getFieldValue(['items', name, 'unitCost']) || 0)).toFixed(2)}</Text></Form.Item></Col>
                        </Row>
                    </Card>
                  ))}
                  {!formIsDisabled && <Space direction={screens.xs ? 'vertical' : 'horizontal'} style={{width: '100%'}}><Button type="dashed" onClick={() => add({ quantityOrdered: 1, unitCost: 0 })} block icon={<PlusOutlined />}>Add Item</Button><Button type="link" onClick={() => setIsProductModalOpen(true)} icon={<PlusOutlined />}>Create New Product</Button></Space>}
                </>
              )}
            </Form.List>
          </Card>
          
          <Card title="Landed Costs (e.g., Shipping, Customs)" style={{marginTop: 24}}>
            <Form.List name="landingCosts">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={[16, 8]} align="bottom" style={{ marginBottom: 8 }}>
                        <Col xs={24} sm={12}><Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]}><Input placeholder="Cost Name (e.g., Shipping)" disabled={formIsDisabled} /></Form.Item></Col>
                        <Col xs={18} sm={8}><Form.Item {...restField} name={[name, 'amount']} rules={[{ required: true }]}><InputNumber addonBefore={currencySymbol} min={0} placeholder="Amount" style={{ width: '100%' }} disabled={formIsDisabled} /></Form.Item></Col>
                        <Col xs={6} sm={4}><Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} disabled={formIsDisabled} /></Col>
                      </Row>
                    ))}
                    {!formIsDisabled && <Button type="dashed" onClick={() => add({ name: '', amount: 0 })} block icon={<PlusOutlined />}>Add Landing Cost</Button>}
                  </>
                )}
            </Form.List>
          </Card>

          <Row justify="end" style={{ marginTop: 24, paddingRight: 16 }}><Col><Title level={4}>Total PO Amount: {currencySymbol}{overallTotal.toFixed(2)}</Title></Col></Row>
          
          <Form.Item style={{ marginTop: 32, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => navigate('/admin/purchase-orders')}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={createLoading || updateLoading} disabled={formIsDisabled}>
                {isEditMode ? 'Save Changes to Draft' : 'Save as Draft'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>

      <SupplierFormModal open={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} onSuccess={(newSupplierId) => { messageApi.success('New supplier created!'); refetchSuppliers().then(() => { form.setFieldsValue({ supplierId: newSupplierId }); setIsSupplierModalOpen(false); }); }} />
      <ProductFormModal open={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSuccess={() => { messageApi.success('New product created!'); refetchProducts(); setIsProductModalOpen(false); }} />
    </>
  );
};

export default PurchaseOrderFormPage;
