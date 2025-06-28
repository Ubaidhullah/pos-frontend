import { gql } from '@apollo/client';

export const DELIVERY_UPDATED_SUBSCRIPTION = gql`
  subscription OnDeliveryUpdated {
    deliveryUpdated {
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