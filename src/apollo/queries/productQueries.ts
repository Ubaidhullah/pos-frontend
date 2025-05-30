import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      sku
      price
      description
      category{
        name
      }
      inventoryItem {
        quantity
      }
    }
  }
`;

export const GET_PRODUCT_BY_ID = gql`
  query GetProductById($id: ID!) {
    product(id: $id) {
      id
      name
      sku
      price
      description
      # categoryId # For pre-selecting in edit form
      inventoryItem {
        quantity # For initialQuantity in edit form if needed, though this is often set on create
      }
    }
  }
`;

// This is the same GET_PRODUCTS query we've been using
export const GET_PRODUCTS_WITH_INVENTORY = gql`
  query GetProductsWithInventory {
    products {
      id
      name
      sku
      price
      category {
        id
        name
      }
      inventoryItem {
        id # ID of the inventory item itself
        quantity
        updatedAt # Useful to see when stock was last changed
      }
    }
  }
`;