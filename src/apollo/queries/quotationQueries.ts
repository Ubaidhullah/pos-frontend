import { gql } from '@apollo/client';

export const GET_QUOTATIONS = gql`
  query GetQuotations($filters: QuotationFilterInput) {
  quotations(filters: $filters) {
      id
      quoteNumber
      status
      validUntil
      grandTotal
      customer {
        id
        name
      }
      user {
        id
        name
      }
      createdAt
    }
  }
`;

export const GET_QUOTATION_BY_ID = gql`
  query GetQuotationById($id: ID!) {
    quotation(id: $id) {
      id
      quoteNumber
      status
      validUntil
      notes
      subTotal
      discountAmount
      taxAmount
      grandTotal
      customer {
        id
        name
      }
      user {
        id
        name
      }
      items {
        id
        product {
          id
          name
          sku
        }
        description
        quantity
        unitPrice
        lineTotal
      }
    }
  }
`;