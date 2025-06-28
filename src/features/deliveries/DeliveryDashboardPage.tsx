import React, { useState, useEffect } from 'react'; // 👈 Import useEffect
import { useQuery, useSubscription } from '@apollo/client';
import { Card, Col, Row, Typography, Spin, Alert, Empty, Tag, Button, Space, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { TruckOutlined, EllipsisOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { GET_DELIVERIES } from '../../apollo/queries/deliveryQueries';
import { DELIVERY_UPDATED_SUBSCRIPTION } from '../../apollo/subscriptions/deliverySubscriptions';
import { DeliveryStatus } from '../../common/enums/delivery-status.enum';
import UpdateDeliveryStatusModal from './UpdateDeliveryStatusModal';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { Title, Text } = Typography;

// --- Interfaces ---
interface DeliveryData {
  id: string;
  deliveryNumber: string;
  status: DeliveryStatus;
  deliveryAddress: string;
  scheduledDate?: string;
  customer?: { name: string };
  driver?: { name: string };
  order: { billNumber: string };
}

const statusColumns: DeliveryStatus[] = [
    DeliveryStatus.PENDING, DeliveryStatus.SCHEDULED, DeliveryStatus.OUT_FOR_DELIVERY,
    DeliveryStatus.DELIVERED, DeliveryStatus.FAILED_ATTEMPT,
];

const statusColors: Record<DeliveryStatus, string> = {
    [DeliveryStatus.PENDING]: 'gold',
    [DeliveryStatus.SCHEDULED]: 'geekblue',
    [DeliveryStatus.OUT_FOR_DELIVERY]: 'blue',
    [DeliveryStatus.DELIVERED]: 'green',
    [DeliveryStatus.FAILED_ATTEMPT]: 'orange',
    [DeliveryStatus.CANCELLED]: 'red',
};

const DeliveryDashboardPage: React.FC = () => {
    const { messageApi } = useAntdNotice();
    const { data, loading, error } = useQuery<{ deliveries: DeliveryData[] }>(GET_DELIVERIES);

    // 👇 FIX #1: Correctly handle the subscription data payload
    useSubscription(DELIVERY_UPDATED_SUBSCRIPTION, {
        onData: ({ client, data: subscriptionData }) => {
            // The data is nested under 'data' and the subscription name
            const updatedDelivery = subscriptionData.data?.deliveryUpdated;
            if (updatedDelivery) {
                messageApi.info(`Delivery #${updatedDelivery.deliveryNumber} status updated to ${updatedDelivery.status}`);
                const existingData = client.readQuery<{ deliveries: DeliveryData[] }>({ query: GET_DELIVERIES });
                if (existingData) {
                    const newDeliveries = existingData.deliveries.map(d =>
                        d.id === updatedDelivery.id ? { ...d, ...updatedDelivery } : d
                    );
                    client.writeQuery({ query: GET_DELIVERIES, data: { deliveries: newDeliveries } });
                }
            }
        }
    });

    const [statusModal, setStatusModal] = useState<{ open: boolean; delivery: DeliveryData | null }>({ open: false, delivery: null });

    // 👇 FIX #2: Move the error handling into a useEffect hook
    useEffect(() => {
        if (error) {
            messageApi.error(`Error loading deliveries: ${error.message}`);
        }
    }, [error, messageApi]);

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Delivery Dashboard</Title>
            {loading && <div style={{textAlign: 'center', padding: 50}}><Spin size="large" /></div>}
            {error && !loading && <Alert message="Could not load deliveries" description={error.message} type="error" showIcon />}
            
            <Row gutter={[16, 16]} style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 16 }}>
                {statusColumns.map(status => (
                    <Col key={status} xs={22} sm={12} md={8} lg={6} xl={4} style={{minWidth: 300}}>
                        <Card title={<Space><TruckOutlined /> {status.replace('_', ' ')}</Space>} style={{height: '100%'}}>
                            <div style={{height: 'calc(100vh - 300px)', overflowY: 'auto'}}>
                                {data?.deliveries.filter(d => d.status === status).length === 0 ? <Empty description="No deliveries" /> :
                                    data?.deliveries.filter(d => d.status === status).map(delivery => (
                                        <Card key={delivery.id} bordered style={{ marginBottom: 16 }}>
                                            <Card.Meta
                                                title={<Text strong>{delivery.deliveryNumber}</Text>}
                                                description={
                                                    <>
                                                        <Text>For Order: {delivery.order.billNumber}</Text><br/>
                                                        <Text>Customer: {delivery.customer?.name || 'N/A'}</Text><br/>
                                                        <Text>Driver: {delivery.driver?.name || <Tag>Unassigned</Tag>}</Text><br/>
                                                        <Text ellipsis>Address: {delivery.deliveryAddress}</Text>
                                                    </>
                                                }
                                            />
                                            <Dropdown
                                                menu={{
                                                    items: [
                                                        { key: 'status', label: 'Update Status' },
                                                        { key: 'driver', label: 'Assign Driver' }
                                                    ],
                                                    onClick: ({ key }) => {
                                                        if (key === 'status') setStatusModal({ open: true, delivery });
                                                        // Add logic for assigning driver
                                                    }
                                                }}
                                                trigger={['click']}
                                            >
                                                <Button icon={<EllipsisOutlined />} style={{position: 'absolute', top: 16, right: 16}} />
                                            </Dropdown>
                                        </Card>
                                    ))
                                }
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
            
            <UpdateDeliveryStatusModal 
                open={statusModal.open} 
                onClose={() => setStatusModal({ open: false, delivery: null })}
                delivery={statusModal.delivery}
            />
        </div>
    );
};

export default DeliveryDashboardPage;
