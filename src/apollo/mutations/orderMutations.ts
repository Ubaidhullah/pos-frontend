import { gql } from '@apollo/client';

export const CREATE_ORDER_MUTATION = gql`
  mutation CreateOrder($createOrderInput: CreateOrderInput!) {
    createOrder(createOrderInput: $createOrderInput) {
      id
      billNumber
      createdAt
      itemsTotal
      totalAmount # Use totalAmount
      amountPaid
      changeGiven
      user {
        name
        email
      }
      customer {
        name
      }
      # 👇 CRUCIAL: You MUST ask for items and payments in the return payload
      items {
        product {
          name
        }
        quantity
        priceAtSale
        lineTotal
      }
      payments {
        method
        amount
      }
    }
  }
`;