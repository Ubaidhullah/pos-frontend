import { gql } from "@apollo/client";


export const LOGIN_MUTATION = gql`
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      accessToken
      user {
        id
        email
        name
        role
        companyId # 👈 Ensure this is requested
      }
    }
  }
`;