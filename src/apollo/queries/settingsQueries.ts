import { gql } from '@apollo/client';

export const GET_SETTINGS = gql`
  query GetSettings {
    settings {
      id
      companyName
      logoUrl
      address
      salesEmail
      baseCurrency
      timezone
      displayCurrency
      billNumberFormat
      paymentNumberFormat
      quoteNumberFormat
      poNumberFormat
      pricesEnteredWithTax
      receiptFooter
      receiptHeader
      receiptShowLogo
      allowPriceEdit
      allowNegativeStock
    }
  }
`;