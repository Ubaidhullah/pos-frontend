import { gql } from '@apollo/client';

export const GET_USERS = gql`
  query GetUsers {
    users { # This query should be available on your backend (UsersResolver)
      id
      email
      name
      role
      createdAt
      companyId
      telegramChatId
    }
  }
`;