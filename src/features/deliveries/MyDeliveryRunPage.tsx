import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { List, Card, Button, Typography, Tag, Spin, Empty, Alert, Space, Divider } from 'antd';
import { PhoneOutlined, EnvironmentOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { MY_ACTIVE_DELIVERY_RUN } from '../../apollo/queries/deliveryQueries';
import { UPDATE_DELIVERY_STATUS } from '../../apollo/mutations/deliveryMutations';
import { DeliveryStatus } from '../../common/enums/delivery-status.enum';
import { useAntdNotice } from '../../contexts/AntdNoticeContext';

const { Title, Text } = Typography;

const MyDeliveryRunPage: React.FC = () => {
    const { messageApi } = useAntdNotice();
    const { data, loading, error, refetch } = useQuery(MY_ACTIVE_DELIVERY_RUN);
    const [updateStatus, { loading: updateLoading }] = useMutation(UPDATE_DELIVERY_STATUS);

    const delivery = data?.myActiveDeliveryRun;

    const handleUpdateStatus = (newStatus: DeliveryStatus) => {
        if (!delivery) return;

        updateStatus({
            variables: {
                updateDeliveryStatusInput: {
                    deliveryId: delivery.id,
                    status: newStatus,
                    notes: `Status updated by driver via mobile.`
                }
            },
            // Optimistically update the UI while the mutation is in flight
            optimisticResponse: {
                updateDeliveryStatus: {
                    __typename: 'Delivery',
                    id: delivery.id,
                    status: newStatus,
                }
            }
        })
        .then(() => messageApi.success(`Delivery marked as ${newStatus.replace('_', ' ')}`))
        .catch(err => messageApi.error(err.message));
    };

    if (loading) return <div style={{textAlign: 'center', padding: 50}}><Spin size="large" tip="Checking for active run..." /></div>;
    if (error) return <Alert message="Error" description={error.message} type="error" showIcon />;
    if (!delivery) return <div style={{textAlign: 'center', padding: 50}}><Empty description="You have no active delivery runs." /></div>;

    const openInMaps = () => {
        const query = encodeURIComponent(delivery.deliveryAddress);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <Card>
            <Title level={3}>Active Run: {delivery.deliveryNumber}</Title>
            <Text>Order for: <Text strong>{delivery.customer?.name || 'N/A'}</Text></Text>
            <Divider />

            <div key={delivery.id} >
                <Title level={5}>Stop 1: {delivery.customer?.name}</Title>
                <Card>
                    <Card.Meta
                        avatar={<Button type="primary" shape="circle" icon={<EnvironmentOutlined />} size="large" onClick={openInMaps} />}
                        title="Delivery Address"
                        description={delivery.deliveryAddress}
                    />
                    {delivery.customer?.phone && (
                        <Button type="link" icon={<PhoneOutlined />} href={`tel:${delivery.customer.phone}`} style={{marginTop: 16}}>
                            Call Customer
                        </Button>
                    )}
                </Card>

                <Card title="Items to Deliver" size="small" style={{ margin: '16px 0' }}>
                    <List
                        dataSource={delivery.order.items}
                        renderItem={(item: { product: { name: string }, quantity: number }) => (
                            <List.Item>
                                <Text>{item.product.name} (Qty: {item.quantity})</Text>
                            </List.Item>
                        )}
                    />
                </Card>

                <Space style={{ width: '100%', justifyContent: 'center' }} size="large">
                    <Button 
                        size="large" 
                        danger 
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleUpdateStatus(DeliveryStatus.FAILED_ATTEMPT)}
                        loading={updateLoading}
                    >
                        Mark as Failed
                    </Button>
                    <Button 
                        type="primary" 
                        size="large" 
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleUpdateStatus(DeliveryStatus.DELIVERED)}
                        loading={updateLoading}
                    >
                        Mark as Delivered
                    </Button>
                </Space>
            </div>
        </Card>
    );
};

export default MyDeliveryRunPage;
