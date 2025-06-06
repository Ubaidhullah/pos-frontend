import { gql } from '@apollo/client';

export const GET_EXPENSE_CATEGORIES = gql`
  query GetExpenseCategories {
    expenseCategories {
      id
      name
      description
    }
  }
`;

export const GET_EXPENSES = gql`
  query GetExpenses(
    $categoryId: ID
    $startDate: DateTime
    $endDate: DateTime
  ) {
    expenses(
      categoryId: $categoryId
      startDate: $startDate
      endDate: $endDate
    ) {
      id
      description
      amount
      expenseDate
      notes
      category {
        id
        name
      }
      user { # User who logged it
        id
        name
      }
    }
  }
`;