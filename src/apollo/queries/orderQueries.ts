import { gql } from '@apollo/client';

export const GET_ORDERS = gql`
  query GetOrders($startDate: DateTime, $endDate: DateTime, $status: String) { # Adjust arg types to match backend
    orders(startDate: $startDate, endDate: $endDate, status: $status) { # Adjust query name/args
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
      items { # Fetch items for detail view
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