import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      sku
      price
      priceIncTax
      standardCostPrice
      imageUrls
      inventoryItem {
        quantity
      }
      category {
        id
        name
      }
      taxes {
        id
        name
        rate
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
      barcode
      description
      price
      priceIncTax
      outletReorderLimit
      standardCostPrice
      imageUrls
      categoryId
      taxes { # Fetch the full tax objects to pre-fill the multi-select
        id
        name
        rate
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
      taxes { # Fetch the full tax objects to pre-fill the multi-select
        id
        name
        rate
      }
    }
  }
`;