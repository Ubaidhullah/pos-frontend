import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { Card, Col, Row, Typography, Spin, Alert, Empty, Tag, Button, Space, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { TruckOutlined, EllipsisOutlined } from '@ant-design/icons';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// --- Local Imports ---
import { GET_DELIVERIES } from '../../apollo/queries/deliveryQueries';
import { UPDATE_DELIVERY_STATUS } from '../../apollo/mutations/deliveryMutations';
import { DELIVERY_UPDATED_SUBSCRIPTION } from '../../apollo/subscriptions/deliverySubscriptions';
import { DeliveryStatus } from '../../common/enums/delivery-status.enum';
import UpdateDeliveryStatusModal from './UpdateDeliveryStatusModal';
import AssignDriverModal from './AssignDriverModal';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';
import DraggableDeliveryCard from './DraggableDeliveryCard'; // Assuming you put it in a separate file

const { Title } = Typography;

// --- Interfaces ---
interface DeliveryData {
  id: string;
  deliveryNumber: string;
  status: DeliveryStatus;
  deliveryAddress: string;
  scheduledDate?: string;
  customer?: { name: string };
  driver?: { id: string; name: string };
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
    const [updateStatus] = useMutation(UPDATE_DELIVERY_STATUS);

    // --- State Management ---
    const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
    const [driverModal, setDriverModal] = useState<{ open: boolean; deliveryId: string | null; currentDriverId?: string | null }>({ open: false, deliveryId: null });
    const [statusModal, setStatusModal] = useState<{ open: boolean; delivery: DeliveryData | null }>({ open: false, delivery: null });

    useEffect(() => {
        if (data?.deliveries) {
            setDeliveries(data.deliveries);
        }
    }, [data]);
    
    useSubscription(DELIVERY_UPDATED_SUBSCRIPTION, {
        onData: ({ client, data: subscriptionData }) => {
            const updatedDelivery = subscriptionData.data?.deliveryUpdated;
            if (updatedDelivery) {
                messageApi.info(`Delivery #${updatedDelivery.deliveryNumber} updated to ${updatedDelivery.status}`);
                // Update local state to reflect the change from subscription
                setDeliveries(prev => prev.map(d => d.id === updatedDelivery.id ? { ...d, ...updatedDelivery } : d));
            }
        }
    });

    const handleMenuClick = (key: string, delivery: DeliveryData) => {
        if (key === 'status') setStatusModal({ open: true, delivery });
        if (key === 'driver') setDriverModal({ open: true, deliveryId: delivery.id, currentDriverId: delivery.driver?.id });
        if (key === 'details') { /* navigate(to details page) */ }
    };

    // --- Drag and Drop Handler ---
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeCard = deliveries.find(d => d.id === active.id);
        const newStatus = over.id as DeliveryStatus;

        if (activeCard && activeCard.status !== newStatus) {
            // Optimistically update the UI state
            setDeliveries(prev => prev.map(d => d.id === active.id ? { ...d, status: newStatus } : d));

            // Call the mutation to update the backend
            updateStatus({
                variables: {
                    updateDeliveryStatusInput: {
                        deliveryId: active.id as string,
                        status: newStatus,
                        notes: `Status changed via drag-and-drop on dashboard.`
                    }
                }
            }).catch(err => {
                messageApi.error(`Failed to update status: ${err.message}`);
                // Revert optimistic update on error
                setDeliveries(prev => prev.map(d => d.id === active.id ? { ...d, status: activeCard.status } : d));
            });
        }
    };

    // Group deliveries by status for rendering
    const deliveriesByStatus = useMemo(() => {
        return statusColumns.reduce((acc, status) => {
            acc[status] = deliveries.filter(d => d.status === status);
            return acc;
        }, {} as Record<DeliveryStatus, DeliveryData[]>);
    }, [deliveries]);


    if (error) messageApi.error(`Error loading deliveries: ${error.message}`);

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Delivery Dashboard</Title>
            {loading && <div style={{textAlign: 'center', padding: 50}}><Spin size="large" /></div>}
            
            <DndContext onDragEnd={handleDragEnd}>
                <Row gutter={[16, 16]} style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 16 }}>
                    {statusColumns.map(status => (
                        <Col key={status} xs={22} sm={12} md={8} lg={6} xl={4} style={{minWidth: 300}}>
                            <Card title={<Space><TruckOutlined /> {status.replace('_', ' ')} ({deliveriesByStatus[status]?.length || 0})</Space>} style={{height: '100%', backgroundColor: '#f7f7f7'}}>
                                <SortableContext items={deliveriesByStatus[status].map(d => d.id)} strategy={verticalListSortingStrategy}>
                                    <div style={{height: 'calc(100vh - 350px)', overflowY: 'auto', padding: '0 4px'}}>
                                        {deliveriesByStatus[status].length === 0 ? <Empty description="No deliveries" /> :
                                            deliveriesByStatus[status].map(delivery => (
                                                <DraggableDeliveryCard key={delivery.id} delivery={delivery} onMenuClick={handleMenuClick} />
                                            ))
                                        }
                                    </div>
                                </SortableContext>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </DndContext>
            
            <UpdateDeliveryStatusModal open={statusModal.open} onClose={() => setStatusModal({ open: false, delivery: null })} delivery={statusModal.delivery} />
            <AssignDriverModal open={driverModal.open} onClose={() => setDriverModal({ open: false, deliveryId: null })} deliveryId={driverModal.deliveryId} currentDriverId={driverModal.currentDriverId} />
        </div>
    );
};

export default DeliveryDashboardPage;
