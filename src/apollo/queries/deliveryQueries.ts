import { gql } from '@apollo/client';

export const GET_DELIVERIES = gql`
  query GetDeliveries($filters: DeliveryFilterInput) {
  
    deliveries(filters: $filters) {
      id
      deliveryNumber
      status
      deliveryAddress
      scheduledDate
      customer {
        id
        name
      }
      driver {
        id
        name
      }
      order {
        id
        billNumber
      }
    }
  }
`;