import { gql } from '@apollo/client';

export const GET_ORDERS = gql`
  query GetOrders($startDate: String, $endDate: String, $status: OrderStatus) {
    orders(startDate: $startDate, endDate: $endDate, status: $status) {
      id
      totalAmount
      status
      createdAt
      user {
        id
        name
        email
      }
      customer {
        id
        name
      }
      items {
        id
        product {
          id
          name
        }
        quantity
        priceAtSale
      }
    }
  }
`;