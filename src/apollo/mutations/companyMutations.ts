import { gql } from '@apollo/client';

export const CREATE_COMPANY_AND_ADMIN = gql`
  mutation CreateCompanyAndAdmin($createCompanyAndAdminInput: CreateCompanyAndAdminInput!) {
    createCompanyAndAdmin(createCompanyAndAdminInput: $createCompanyAndAdminInput) {
      accessToken
      user {
        id
        name
        email
        role
        companyId
      }
    }
  }
`;
