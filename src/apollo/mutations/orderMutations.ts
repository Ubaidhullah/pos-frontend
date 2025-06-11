import { gql } from '@apollo/client';

export const CREATE_ORDER_MUTATION = gql`
  mutation CreateOrder($createOrderInput: CreateOrderInput!) {
    createOrder(createOrderInput: $createOrderInput) {
      id
      billNumber
      totalAmount
      grandTotal 
      amountPaid
      changeGiven
      # Also fetch the full details for the receipt
      createdAt
      itemsTotal
      taxAmount
      discountAmount
      subTotal
      user { name, email }
      customer { name }
      items {
        product { name }
        quantity
        priceAtSale
        lineTotal
        discountAmount
        finalLineTotal
      }
      payments {
        method
        amount
      }
      customer { name }
      createdAt
    }
  }
`;