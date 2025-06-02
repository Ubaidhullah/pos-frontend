import { gql } from '@apollo/client';

export const CREATE_SUPPLIER = gql`
  mutation CreateSupplier($createSupplierInput: CreateSupplierInput!) {
    createSupplier(createSupplierInput: $createSupplierInput) {
      id
      name
      email
    }
  }
`;

export const UPDATE_SUPPLIER = gql`
  mutation UpdateSupplier($id: ID!, $updateSupplierInput: UpdateSupplierInput!) {
    updateSupplier(id: $id, updateSupplierInput: $updateSupplierInput) {
      id
      name
      email
    }
  }
`;

export const DELETE_SUPPLIER = gql`
  mutation DeleteSupplier($id: ID!) {
    removeSupplier(id: $id) {
      id
    }
  }
`;

export const LINK_PRODUCT_TO_SUPPLIER = gql`
  mutation LinkProductToSupplier($linkProductToSupplierInput: LinkProductToSupplierInput!) {
    linkProductToSupplier(linkProductToSupplierInput: $linkProductToSupplierInput) {
      id # ID of the ProductSupplier record
      productId
      supplierId
      costPrice
      supplierProductCode
      product {
        id
        name
      }
    }
  }
`;

export const UNLINK_PRODUCT_FROM_SUPPLIER = gql`
  mutation UnlinkProductFromSupplier($unlinkProductFromSupplierInput: UnlinkProductFromSupplierInput!) {
    unlinkProductFromSupplier(unlinkProductFromSupplierInput: $unlinkProductFromSupplierInput) {
      id # ID of the deleted ProductSupplier record
    }
  }
`;