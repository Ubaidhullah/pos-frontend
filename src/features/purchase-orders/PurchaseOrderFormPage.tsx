import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import {
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  DatePicker,
  Space,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Spin,
  Empty,
  Popconfirm,
  Alert
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import moment from 'moment';
import type { Moment } from 'moment';
import { GET_SUPPLIERS } from '../../apollo/queries/supplierQueries';
import { GET_PRODUCTS } from '../../apollo/queries/productQueries'; // Basic product list
import { GET_PURCHASE_ORDER_BY_ID } from '../../apollo/queries/purchaseOrderQueries';
import { CREATE_PURCHASE_ORDER, UPDATE_DRAFT_PURCHASE_ORDER } from '../../apollo/mutations/purchaseOrderMutations';
import { PurchaseOrderStatus } from '../../common/enums/purchase-order-status.enum'; // Frontend enum
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface SupplierInfo { id: string; name: string; }
interface ProductInfo { id: string; name: string; sku?: string; } // Product for selection

// Interface for form values, especially for items
interface POItemFormValue {
  productId?: string;
  quantityOrdered?: number;
  unitCost?: number;
  // product?: ProductInfo; // Not directly part of form value, derived from productId
}

interface PurchaseOrderFormValues {
  poNumber?: string; // Will be auto-generated if not provided on create
  supplierId?: string;
  orderDate?: Moment;
  expectedDeliveryDate?: Moment;
  notes?: string;
  shippingCost?: number;
  taxes?: number;
  items: POItemFormValue[];
}

const PurchaseOrderFormPage: React.FC = () => {
  const { id: poId } = useParams<{ id: string }>(); // For edit mode
  const navigate = useNavigate();
  const [form] = Form.useForm<PurchaseOrderFormValues>();
  const { hasRole, user: currentUser } = useAuth();

  const isEditMode = !!poId;
  const [currentPoStatus, setCurrentPoStatus] = useState<PurchaseOrderStatus | null>(null);

  // --- Data Fetching ---
  const { data: suppliersData, loading: suppliersLoading } = useQuery<{ suppliers: SupplierInfo[] }>(GET_SUPPLIERS);
  const { data: productsData, loading: productsLoading } = useQuery<{ products: ProductInfo[] }>(GET_PRODUCTS); // For item selection

  const [fetchPO, { data: poData, loading: poLoading, error: poError }] = useLazyQuery(GET_PURCHASE_ORDER_BY_ID);

  // --- Mutations ---
  const [createPO, { loading: createLoading }] = useMutation(CREATE_PURCHASE_ORDER);
  const [updateDraftPO, { loading: updateLoading }] = useMutation(UPDATE_DRAFT_PURCHASE_ORDER);

  const [overallTotal, setOverallTotal] = useState<number>(0);

  // --- Effects ---
  useEffect(() => {
    if (isEditMode && poId) {
      fetchPO({ variables: { id: poId } });
    }
  }, [isEditMode, poId, fetchPO]);

  useEffect(() => {
    if (isEditMode && poData?.purchaseOrder) {
      const { purchaseOrder } = poData;
      setCurrentPoStatus(purchaseOrder.status as PurchaseOrderStatus);
      if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT && purchaseOrder.status !== null) { // status could be null if not set by backend initially
        message.warning(`This Purchase Order is in '${purchaseOrder.status}' status and may not be fully editable.`);
        // Consider disabling form if not DRAFT
      }
      form.setFieldsValue({
        poNumber: purchaseOrder.poNumber,
        supplierId: purchaseOrder.supplierId,
        orderDate: purchaseOrder.orderDate ? moment(purchaseOrder.orderDate) : undefined,
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ? moment(purchaseOrder.expectedDeliveryDate) : undefined,
        notes: purchaseOrder.notes || '',
        shippingCost: purchaseOrder.shippingCost || 0,
        taxes: purchaseOrder.taxes || 0,
        items: purchaseOrder.items.map((item: { productId: any; quantityOrdered: any; unitCost: any; }) => ({
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          // We don't store product object in form value directly
        })),
      });
      calculateOverallTotal(purchaseOrder.items, purchaseOrder.shippingCost, purchaseOrder.taxes);
    } else if (!isEditMode) {
        // Set default values for new PO
        form.setFieldsValue({
            orderDate: moment(),
            items: [{ productId: undefined, quantityOrdered: 1, unitCost: 0 }], // Start with one empty item
            shippingCost: 0,
            taxes: 0,
        });
        calculateOverallTotal([{quantityOrdered: 1, unitCost: 0}], 0, 0);
    }
  }, [isEditMode, poData, form]);


  const calculateOverallTotal = useCallback((items?: any[], shippingCost?: number, taxes?: number) => {
    let itemsTotal = 0;
    if (items) {
      itemsTotal = items.reduce((sum, item) => {
        const quantity = Number(item?.quantityOrdered) || 0;
        const cost = Number(item?.unitCost) || 0;
        return sum + quantity * cost;
      }, 0);
    }
    const finalTotal = itemsTotal + (Number(shippingCost) || 0) + (Number(taxes) || 0);
    setOverallTotal(finalTotal);
  }, []);


  // Recalculate total when form values change
  const handleFormValuesChange = (changedValues: any, allValues: PurchaseOrderFormValues) => {
    if (changedValues.items || changedValues.shippingCost !== undefined || changedValues.taxes !== undefined) {
      calculateOverallTotal(allValues.items, allValues.shippingCost, allValues.taxes);
    }
  };

  // --- Form Submission ---
  const onFinish = async (values: PurchaseOrderFormValues) => {
    if (currentPoStatus && currentPoStatus !== PurchaseOrderStatus.DRAFT && isEditMode) {
        message.error(`Cannot update PO. Status is '${currentPoStatus}'. Only DRAFT POs can be modified.`);
        return;
    }

    const submissionInput = {
      ...values,
      poNumber: values.poNumber || undefined, // Let backend auto-generate if empty on create
      orderDate: values.orderDate ? values.orderDate.toISOString() : new Date().toISOString(),
      expectedDeliveryDate: values.expectedDeliveryDate ? values.expectedDeliveryDate.toISOString() : undefined,
      items: values.items.map(item => ({
        productId: item.productId,
        quantityOrdered: Number(item.quantityOrdered),
        unitCost: Number(item.unitCost),
      })).filter(item => item.productId && item.quantityOrdered > 0 && item.unitCost >= 0), // Filter out invalid items
      shippingCost: Number(values.shippingCost) || 0,
      taxes: Number(values.taxes) || 0,
    };

    if (submissionInput.items.length === 0) {
        message.error('Please add at least one valid item to the purchase order.');
        return;
    }

    try {
      if (isEditMode && poId) {
        await updateDraftPO({ variables: { id: poId, updatePurchaseOrderInput: submissionInput } });
        message.success('Purchase Order updated successfully!');
      } else {
        const result = await createPO({ variables: { createPurchaseOrderInput: submissionInput } });
        message.success(`Purchase Order ${result.data?.createPurchaseOrder?.poNumber || ''} created successfully!`);
      }
      navigate('/admin/purchase-orders'); // Navigate back to list page
    } catch (err: any) {
      message.error(`Failed to save Purchase Order: ${err.message}`);
    }
  };

  if (poLoading && isEditMode) return <div style={{textAlign: 'center', padding: '50px'}}><Spin size="large" tip="Loading Purchase Order..."/></div>;
  if (poError && isEditMode) return <Alert message="Error" description={`Failed to load PO: ${poError.message}`} type="error" showIcon />;

  // Check permissions
  if (!hasRole([Role.ADMIN, Role.MANAGER])) {
    return <Alert message="Access Denied" description="You do not have permission to manage purchase orders." type="error" showIcon />;
  }
  if (isEditMode && currentPoStatus && currentPoStatus !== PurchaseOrderStatus.DRAFT) {
    // Optionally make the form read-only or just show a prominent message
    // For now, submission logic handles this, but UI could be disabled.
  }


  return (
    <div style={{ padding: '24px' }}>
        <Space style={{ marginBottom: 24 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/purchase-orders')}>
                Back to PO List
            </Button>
            <Title level={2} style={{ margin: 0 }}>
                {isEditMode ? `Edit Purchase Order: ${poData?.purchaseOrder?.poNumber || ''}` : 'Create New Purchase Order'}
            </Title>
        </Space>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={handleFormValuesChange}
        // initialValues - set via useEffect or directly here for create mode defaults
      >
        <Card title="PO Header Information">
          <Row gutter={16}>
            {!isEditMode && ( // Allow setting PO number only on create, or make it read-only if auto-generated
                <Col xs={24} sm={12} md={8}>
                    <Form.Item name="poNumber" label="PO Number (Optional)" tooltip="Leave blank for auto-generation, or enter a unique PO number.">
                    <Input placeholder="e.g., PO-2025-001"/>
                    </Form.Item>
                </Col>
            )}
            {isEditMode && poData?.purchaseOrder?.poNumber && (
                 <Col xs={24} sm={12} md={8}>
                    <Form.Item label="PO Number">
                        <Input value={poData.purchaseOrder.poNumber} disabled />
                    </Form.Item>
                </Col>
            )}
            <Col xs={24} sm={12} md={isEditMode ? 8 : 16}> {/* Adjust span if poNumber is shown */}
              <Form.Item name="supplierId" label="Supplier" rules={[{ required: true, message: 'Please select a supplier!' }]}>
                <Select
                  showSearch
                  placeholder="Select a supplier"
                  loading={suppliersLoading}
                  disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {suppliersData?.suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="orderDate" label="Order Date" rules={[{ required: true, message: 'Order date is required.' }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}/>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="expectedDeliveryDate" label="Expected Delivery Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}/>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
                <Form.Item name="shippingCost" label="Shipping Cost" initialValue={0}>
                    <InputNumber addonBefore="$" style={{ width: '100%' }} min={0} precision={2} disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}/>
                </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
                <Form.Item name="taxes" label="Taxes" initialValue={0}>
                    <InputNumber addonBefore="$" style={{ width: '100%' }} min={0} precision={2} disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}/>
                </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes / Remarks">
            <TextArea rows={3} placeholder="Any specific instructions or notes for this PO" disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}/>
          </Form.Item>
        </Card>

        <Divider />

        <Card title="Purchase Order Items">
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card key={key} style={{ marginBottom: 16, background: '#fafafa' }} bodyStyle={{padding: '12px'}}>
                    <Row gutter={16} align="middle">
                      <Col xs={24} md={10}>
                        <Form.Item
                          {...restField}
                          name={[name, 'productId']}
                          label={`Item ${index + 1}: Product`}
                          rules={[{ required: true, message: 'Please select a product.' }]}
                        >
                          <Select
                            showSearch
                            placeholder="Select product"
                            loading={productsLoading}
                            disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}
                            filterOption={(input, option) =>
                                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase()) ||
                                (option?.dataSku as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {productsData?.products.map(p => <Option key={p.id} value={p.id} dataSku={p.sku}>{p.name} (SKU: {p.sku || 'N/A'})</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantityOrdered']}
                          label="Qty Ordered"
                          rules={[{ required: true, message: 'Qty req.' }, {type: 'number', min: 1, message: 'Min 1'}]}
                          initialValue={1}
                        >
                          <InputNumber style={{ width: '100%' }} min={1} disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}/>
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'unitCost']}
                          label="Unit Cost"
                          rules={[{ required: true, message: 'Cost req.' }, {type: 'number', min: 0, message: 'Min 0'}]}
                          initialValue={0}
                        >
                          <InputNumber addonBefore="$" style={{ width: '100%' }} min={0} precision={2} disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT}/>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item label="Subtotal">
                            <Text strong>
                            $
                            {((form.getFieldValue(['items', name, 'quantityOrdered']) || 0) *
                                (form.getFieldValue(['items', name, 'unitCost']) || 0)).toFixed(2)}
                            </Text>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={2} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                        {fields.length > 0 && !(isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT) && ( // Allow remove if more than one item or if it's the only one and form not disabled
                            <Button
                                type="dashed"
                                onClick={() => remove(name)}
                                icon={<DeleteOutlined />}
                                danger
                                block
                            />
                        )}
                      </Col>
                    </Row>
                  </Card>
                ))}
                {!(isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT) && (
                    <Form.Item>
                        <Button type="dashed" onClick={() => add({quantityOrdered: 1, unitCost: 0})} block icon={<PlusOutlined />}>
                            Add Item
                        </Button>
                    </Form.Item>
                )}
              </>
            )}
          </Form.List>
          {(!form.getFieldValue('items') || form.getFieldValue('items').length === 0) && <Empty description="No items added to this purchase order yet." />}
        </Card>

        <Divider />

        <Row justify="end" style={{ marginTop: 24 }}>
          <Col>
            <Space direction="vertical" align="end" size="small">
              <Text strong style={{fontSize: '1.2em'}}>Subtotal (Items): ${ (overallTotal - (form.getFieldValue('shippingCost') || 0) - (form.getFieldValue('taxes') || 0)).toFixed(2) }</Text>
              <Text>Shipping: ${ (form.getFieldValue('shippingCost') || 0).toFixed(2) }</Text>
              <Text>Taxes: ${ (form.getFieldValue('taxes') || 0).toFixed(2) }</Text>
              <Title level={4} style={{ margin: 0 }}>Overall Total: ${overallTotal.toFixed(2)}</Title>
            </Space>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 32, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => navigate('/admin/purchase-orders')}>Cancel</Button>
            <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={createLoading || updateLoading}
                disabled={isEditMode && currentPoStatus !== PurchaseOrderStatus.DRAFT && currentPoStatus !== null}
            >
              {isEditMode ? 'Save Changes to Draft' : 'Save as Draft'}
            </Button>
            {/* You might add other actions like "Submit for Approval" which would change status */}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default PurchaseOrderFormPage;