import { gql } from '@apollo/client';

export const GET_ORDERS = gql`
  query GetOrders($startDate: DateTime, $endDate: DateTime, $status: OrderStatus) {
    orders(startDate: $startDate, endDate: $endDate, status: $status) {
      id
      totalAmount
      status
      createdAt
      billNumber
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

// Add this new query to the file
export const GET_ORDER_BY_BILL_NUMBER = gql`
  query GetOrderByBillNumber($billNumber: String!) {
    orderByBillNumber(billNumber: $billNumber) {
      id
      billNumber
      status
      items {
        id
        quantity
        quantityReturned
        priceAtSale
        lineTotal
        product {
          id
          name
          sku
        }
      }
    }
  }
`;


export const GET_ORDER_DETAILS_BY_ID = gql`
  query GetOrderDetailsById($id: ID!) {
    order(id: $id) { # Assuming you have a general 'order' query that finds by ID
      id
      billNumber
      createdAt
      status
      itemsTotal
      discountAmount
      subTotal
      taxAmount
      grandTotal
      amountPaid
      changeGiven
      # notes
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
          sku
        }
        quantity
        priceAtSale
        lineTotal
        discountAmount
        finalLineTotal
      }
      payments {
        id
        method
        amount
      }
    }
  }
`;