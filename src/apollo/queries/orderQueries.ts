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

export const GET_ORDER_FOR_RETURN = gql`
  query GetOrderForReturn($id: ID!) {
    order(id: $id) {
      id
      billNumber # ✅ CORRECT: Use billNumber instead of poNumber
      status
      items {
        id
        quantity
        quantityReturned # ✅ CORRECT: This field now exists
        priceAtSale
        total            # ✅ CORRECT: This field now exists
        product {
          id
          name
          sku
        }
      }
    }
  }
`;