import { gql } from '@apollo/client';

export const FIND_COMPANIES_BY_EMAIL = gql`
  query FindCompaniesByEmail($email: String!) {
    companiesByEmail(email: $email) {
      id
      name
    }
  }
`;