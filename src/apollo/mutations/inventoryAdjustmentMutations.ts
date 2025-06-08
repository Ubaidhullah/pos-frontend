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