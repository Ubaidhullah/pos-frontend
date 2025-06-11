import { gql } from '@apollo/client';

export const GET_TAXES = gql`
  query GetTaxes {
    taxes {
      id
      name
      rate
      description
      isEnabled
      isDefault
    }
  }
`;