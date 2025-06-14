import { gql } from '@apollo/client';

export const CREATE_TAX = gql`
  mutation CreateTax($createTaxInput: CreateTaxInput!) {
    createTax(createTaxInput: $createTaxInput) {
      id
      name
    }
  }
`;

export const UPDATE_TAX = gql`
  mutation UpdateTax($id: ID!, $updateTaxInput: UpdateTaxInput!) {
    updateTax(id: $id, updateTaxInput: $updateTaxInput) {
      id
      name
      isEnabled
      # isDefault
    }
  }
`;

export const REMOVE_TAX = gql`
  mutation RemoveTax($id: ID!) {
    removeTax(id: $id) {
      id
    }
  }
`;