import { gql } from '@apollo/client';

export const CREATE_SALES_RETURN = gql`
  mutation CreateSalesReturn($createReturnInput: CreateReturnInput!) {
    createSalesReturn(createReturnInput: $createReturnInput) {
      id
      returnNumber
      totalRefundAmount
    }
  }
`;