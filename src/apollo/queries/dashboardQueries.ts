import { gql } from '@apollo/client';

export const GET_DASHBOARD_SUMMARY = gql`
  query GetDashboardSummary {
    dashboardSummary {
      totalSalesToday
      ordersTodayCount
      lowStockItemsCount
      # You could add more: totalSalesThisWeek, newCustomersToday etc.
    }
  }
`;

export const GET_RECENT_ORDERS_FOR_DASHBOARD = gql`
  query GetRecentOrdersForDashboard($limit: Int) {
    recentOrders(limit: $limit) { # New query on backend
      id
      totalAmount
      status
      createdAt
      customer {
        id
        name
      }
      user {
        id
        name
      }
    }
  }
`;

// You might reuse GET_PRODUCTS_WITH_INVENTORY and filter client-side for low stock,
// or create a specific backend query for low stock items.
export const GET_LOW_STOCK_ITEMS = gql`
  query GetLowStockItems($threshold: Int, $limit: Int) {
    lowStockItems(threshold: $threshold, limit: $limit) { # New query on backend
      id
      name
      sku
      inventoryItem {
        quantity
      }
    }
  }
`;