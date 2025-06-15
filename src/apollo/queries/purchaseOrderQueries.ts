import { gql } from '@apollo/client';

// Query to get all POs, potentially with filters
export const GET_PURCHASE_ORDERS = gql`
  query PurchaseOrders(
    $supplierId: String
    $status: String
    $startDate: DateTime
    $endDate: DateTime
  ) {
    purchaseOrders( # Ensure backend resolver supports these filter arguments
      supplierId: $supplierId
      status: $status
      startDate: $startDate
      endDate: $endDate
    ) {
      id
      poNumber
      orderDate
      expectedDeliveryDate
      actualDeliveryDate
      status
      totalAmount
      supplier {
        id
        name
      }
      user { # User who created/managed
        id
        name
        email
      }
      items { # For quick summary, or expanded view
        id
        product {
            id
            name
        }
        quantityOrdered
        quantityReceived
      }
      createdAt
    }
  }
`;

export const GET_PURCHASE_ORDER_BY_ID = gql`
  query GetPurchaseOrderById($id: ID!) {
    purchaseOrder(id: $id) {
      id
      poNumber
      orderDate
      expectedDeliveryDate
      actualDeliveryDate
      status
      totalAmount
      notes
      shippingCost
      landingCosts
      taxes
      supplier {
        id
        name
        email
        phone
        address
      }
      user {
        id
        name
        email
      }
      items {
        id
        productId
        product {
          id
          name
          sku
        }
        quantityOrdered
        quantityReceived
        unitCost
        totalCost
      }
      createdAt
      updatedAt
    }
  }
`;