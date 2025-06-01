import { gql } from '@apollo/client';

export const GET_SALES_SUMMARY_BY_DATE_RANGE = gql`
  query GetSalesSummaryByDateRange($startDate: DateTime!, $endDate: DateTime!) {
    salesSummaryByDateRange(startDate: $startDate, endDate: $endDate) { # New query name
      totalSales
      numberOfOrders
      averageOrderValue
      # You could add more: totalItemsSold, breakdownByPaymentMethod etc.
    }
  }
`;