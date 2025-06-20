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
      createdAt
      itemsTotal
      taxAmount
      discountAmount
      subTotal
      status
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

export const ADD_PAYMENT_TO_ORDER_MUTATION = gql`
  mutation AddPaymentToOrder($addPaymentToOrderInput: AddPaymentToOrderInput!) {
    addPaymentToOrder(addPaymentToOrderInput: $addPaymentToOrderInput) {
      id
      status
      amountPaid
      grandTotal
    }
  }
`;