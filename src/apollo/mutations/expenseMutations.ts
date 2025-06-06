import { gql } from '@apollo/client';

// Mutations for Categories
export const CREATE_EXPENSE_CATEGORY = gql`
  mutation CreateExpenseCategory($createExpenseCategoryInput: CreateExpenseCategoryInput!) {
    createExpenseCategory(createExpenseCategoryInput: $createExpenseCategoryInput) {
      id
      name
    }
  }
`;

export const UPDATE_EXPENSE_CATEGORY = gql`
  mutation UpdateExpenseCategory($id: ID!, $updateExpenseCategoryInput: UpdateExpenseCategoryInput!) {
    updateExpenseCategory(id: $id, updateExpenseCategoryInput: $updateExpenseCategoryInput) {
      id
      name
    }
  }
`;

export const REMOVE_EXPENSE_CATEGORY = gql`
  mutation RemoveExpenseCategory($id: ID!) {
    removeExpenseCategory(id: $id) {
      id
    }
  }
`;


// Mutations for Expenses
export const CREATE_EXPENSE = gql`
  mutation CreateExpense($createExpenseInput: CreateExpenseInput!) {
    createExpense(createExpenseInput: $createExpenseInput) {
      id
      description
      amount
    }
  }
`;

export const UPDATE_EXPENSE = gql`
  mutation UpdateExpense($id: ID!, $updateExpenseInput: UpdateExpenseInput!) {
    updateExpense(id: $id, updateExpenseInput: $updateExpenseInput) {
      id
      description
      amount
    }
  }
`;

export const REMOVE_EXPENSE = gql`
  mutation RemoveExpense($id: ID!) {
    removeExpense(id: $id) {
      id
    }
  }
`;