import { gql } from '@apollo/client';

export const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($createCustomerInput: CreateCustomerInput!) {
    createCustomer(createCustomerInput: $createCustomerInput) {
      id
      name
      email
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: ID!, $updateCustomerInput: UpdateCustomerInput!) {
    updateCustomer(id: $id, updateCustomerInput: $updateCustomerInput) {
      id
      name
      email
    }
  }
`;

export const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: ID!) {
    removeCustomer(id: $id) {
      id
    }
  }
`;