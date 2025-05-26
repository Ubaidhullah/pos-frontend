import { gql } from '@apollo/client';

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($createCategoryInput: CreateCategoryInput!) {
    createCategory(createCategoryInput: $createCategoryInput) {
      id
      name
    }
  }
`;

export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: ID!, $updateCategoryInput: UpdateCategoryInput!) {
    updateCategory(id: $id, updateCategoryInput: $updateCategoryInput) {
      id
      name
    }
  }
`;

export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: ID!) {
    removeCategory(id: $id) { # Ensure this matches your backend resolver name
      id
    }
  }
`;