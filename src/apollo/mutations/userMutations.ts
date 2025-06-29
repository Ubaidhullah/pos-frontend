import { gql } from '@apollo/client';

export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($updateUserRoleInput: UpdateUserRoleInput!) {
    updateUserRole(updateUserRoleInput: $updateUserRoleInput) {
      id
      email
      name
      role # Ensure the updated role is returned
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($createUserInput: CreateUserInput!) {
    createUser(createUserInput: $createUserInput) {
      id
      name
      email
      username
      role
    }
  }
`;

export const GET_USERS_FOR_ASSIGNMENT = gql`
  query GetUsersForAssignment {
    users {
      id
      name
      email
      role
    }
  }
`;