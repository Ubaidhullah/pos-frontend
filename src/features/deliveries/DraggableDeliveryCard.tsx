import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Typography, Tag, Button, Dropdown, type MenuProps, Row, Col } from 'antd';
import { EllipsisOutlined, HolderOutlined } from '@ant-design/icons';
import { DeliveryStatus } from '../../common/enums/delivery-status.enum';

// ... other necessary imports like DeliveryData, MenuProps, etc.

const { Text } = Typography;

interface DeliveryData { id: string; deliveryNumber: string; status: DeliveryStatus; deliveryAddress: string; scheduledDate?: string; customer?: { name: string; }; driver?: { id: string; name: string; }; order: { billNumber: string; }; }


const DraggableDeliveryCard = ({ delivery, onMenuClick }: { delivery: DeliveryData, onMenuClick: (key: string, delivery: DeliveryData) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: delivery.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Add a shadow and lift effect when dragging
    boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : 'none',
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

   const menuItems: MenuProps['items'] = [
      { key: 'status', label: 'Update Status' },
      { key: 'driver', label: 'Assign Driver' },
      { key: 'details', label: 'View Details' }
  ];

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
       <Card bordered style={{ marginBottom: 16 }}>
          <Row align="middle" wrap={false}>
            <Col flex="30px">
                <Button {...listeners} type="text" icon={<HolderOutlined style={{ cursor: 'grab' }} />} />
            </Col>
            <Col flex="auto">
                <Card.Meta
                    title={<Text strong>{delivery.deliveryNumber}</Text>}
                    description={
                        <>
                            <Text>For Order: {delivery.order.billNumber}</Text><br/>
                            <Text>Customer: {delivery.customer?.name || 'N/A'}</Text><br/>
                            <Text>Driver: {delivery.driver?.name || <Tag>Unassigned</Tag>}</Text>
                        </>
                    }
                />
            </Col>
            <Col flex="30px">
                <Dropdown menu={{ items: menuItems, onClick: (info) => onMenuClick(info.key, delivery) }} trigger={['click']}>
                    <Button type="text" icon={<EllipsisOutlined />} />
                </Dropdown>
            </Col>
          </Row>
      </Card>
    </div>
  );
};

export default DraggableDeliveryCard;