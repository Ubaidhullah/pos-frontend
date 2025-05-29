import { gql } from '@apollo/client';

export const GET_CUSTOMERS = gql`
  query GetCustomers{ # Optional search term
    customers { # Adjust query name and args based on backend
      id
      name
      email
      phone
      address
    }
  }
`;
// Add GET_CUSTOMER_BY_ID if needed for edit form prefill, similar to products