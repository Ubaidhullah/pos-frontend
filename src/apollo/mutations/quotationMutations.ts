import { gql } from '@apollo/client';

export const CREATE_QUOTATION = gql`
  mutation CreateQuotation($createQuotationInput: CreateQuotationInput!) {
    createQuotation(createQuotationInput: $createQuotationInput) {
      id
      quoteNumber
    }
  }
`;

export const UPDATE_QUOTATION_STATUS = gql`
  mutation UpdateQuotationStatus($id: ID!, $status: QuotationStatus!) {
    updateQuotationStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const CREATE_ORDER_FROM_QUOTATION = gql`
  mutation CreateOrderFromQuotation($quotationId: ID!) {
    createOrderFromQuotation(quotationId: $quotationId) {
      id # Returns the ID of the newly created order
      billNumber
    }
  }
`;

export const UPDATE_QUOTATION = gql`
  mutation UpdateQuotation($id: ID!, $updateQuotationInput: UpdateQuotationInput!) {
    updateQuotation(id: $id, updateQuotationInput: $updateQuotationInput) {
      id # Return the ID of the updated quote to confirm success
      quoteNumber
      status
    }
  }
`;
