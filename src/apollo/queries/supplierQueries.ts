import { gql } from '@apollo/client';

export const GET_SUPPLIERS = gql`
  query GetSuppliers {
    suppliers {
      id
      name
      contactName
      email
      phone
      address
      createdAt
      productsSupplied { # For a quick count or summary if needed on list page
        id
        productId # ID of the ProductSupplier record
        product {
          id
          name
        }
        costPrice
        supplierProductCode
      }
    }
  }
`;

export const GET_SUPPLIER_BY_ID = gql`
  query GetSupplierById($id: ID!) {
    supplier(id: $id) {
      id
      name
      contactName
      email
      phone
      address
      notes
      createdAt
      updatedAt
      productsSupplied {
        id # ID of the ProductSupplier link
        productId
        product {
          id
          name
          sku
        }
        costPrice
        supplierProductCode
      }
    }
  }
`;

// We also need a query to get all products for linking
// This can reuse the existing GET_PRODUCTS from productQueries.ts
// import { GET_PRODUCTS } from './productQueries';