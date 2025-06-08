import { gql } from '@apollo/client';

export const GET_INVENTORY_ADJUSTMENT_HISTORY = gql`
  query GetInventoryAdjustmentHistory($productId: ID!) {
    inventoryAdjustmentHistory(productId: $productId) {
      id
      quantityChange
      newQuantity
      reason
      notes
      createdAt
      user {
        id
        name
        email
      }
    }
  }
`;