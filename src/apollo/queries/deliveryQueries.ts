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

export const MY_ACTIVE_DELIVERY_RUN = gql`
  query MyActiveDeliveryRun {
    myActiveDeliveryRun {
      id
      deliveryNumber
      status
      deliveryAddress
      notes
      customer {
        id
        name
        phone
      }
      order {
        id
        billNumber
        items {
          id
          quantity
          product {
            name
          }
        }
      }
    }
  }
`;