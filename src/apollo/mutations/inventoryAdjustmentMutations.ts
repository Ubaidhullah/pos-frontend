import { gql } from '@apollo/client';

export const CREATE_MANUAL_ADJUSTMENT = gql`
  mutation CreateManualAdjustment($createManualAdjustmentInput: CreateManualAdjustmentInput!) {
    createManualAdjustment(createManualAdjustmentInput: $createManualAdjustmentInput) {
      # The mutation returns the updated InventoryItem
      id
      quantity
      updatedAt
    }
  }
`;


export const MANUALLY_SET_STOCK = gql`
  mutation ManuallySetStock($manualStockAdjustmentInput: ManualStockAdjustmentInput!) {
    manuallySetStock(manualStockAdjustmentInput: $manualStockAdjustmentInput) {
      # The mutation returns the updated InventoryItem
      id
      quantity
      updatedAt
      product {
        id
        name
      }
    }
  }
`;