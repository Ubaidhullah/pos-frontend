import { gql } from '@apollo/client';

export const SET_STOCK_MUTATION = gql`
  mutation SetStock($setStockInput: SetStockInput!) {
    setStock(setStockInput: $setStockInput) { # Matches backend InventoryResolver.setStock
      id # ID of the InventoryItem
      productId
      quantity
      updatedAt
    }
  }
`;

// Optionally, if you want an "adjust by amount" feature too:
// export const ADJUST_STOCK_MUTATION = gql`
//   mutation AdjustStock($updateStockInput: UpdateStockInput!) { // Ensure DTO name matches backend
//     updateStock(updateStockInput: $updateStockInput) {
//       id
//       productId
//       quantity
//       updatedAt
//     }
//   }
// `;