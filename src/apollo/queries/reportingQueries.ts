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

export const GET_DAILY_SALES = gql`
  query GetDailySales($startDate: DateTime!, $endDate: DateTime!) {
    dailySales(startDate: $startDate, endDate: $endDate) {
      date
      value
    }
  }
`;

export const GET_SALES_BREAKDOWN_BY_CATEGORY = gql`
  query GetSalesBreakdownByCategory($startDate: DateTime!, $endDate: DateTime!) {
    salesBreakdownByCategory(startDate: $startDate, endDate: $endDate) {
      categoryName
      totalSales
    }
  }
`;

export const GET_TOP_SELLING_PRODUCTS = gql`
  query GetTopSellingProducts($startDate: DateTime!, $endDate: DateTime!, $take: Int!) {
    topSellingProducts(startDate: $startDate, endDate: $endDate, take: $take) {
      product {
        id
        name
        sku
        price
      }
      totalQuantitySold
      totalRevenue
    }
  }
`;

export const GET_SALES_REPORT = gql`
  query GetSalesReport($filters: ReportFilterInput, $groupBy: String!) {
    salesReport(filters: $filters, groupBy: $groupBy) 
  }
`;


export const GET_ORDER_BASED_REPORT = gql`
  query GetOrderBasedReport($filters: ReportFilterInput, $reportType: String!) {
    orderBasedReport(filters: $filters, reportType: $reportType) { 
      id
      billNumber
      status
      grandTotal
      amountPaid
      createdAt
      customer {
        name
      }
    }
  }
`;

export const GET_OUTSTANDING_BILLS_REPORT = gql`
  query GetOutstandingBillsReport($filters: ReportFilterInput) {
    outstandingBillsReport(filters: $filters) {
      id
      billNumber
      status
      grandTotal
      amountPaid
      createdAt
      customer {
        name
      }
    }
  }
`;

export const GET_INVENTORY_CHANGES_REPORT = gql`
  query GetInventoryChangesReport($filters: ReportFilterInput!) {
    inventoryChangesReport(filters: $filters) {
      product {
        id
        name
        sku
      }
      netChange
    }
  }
`;