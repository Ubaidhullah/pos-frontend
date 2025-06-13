import { gql } from '@apollo/client';

export const EXPORT_ORDERS_AS_CSV = gql`
  query ExportOrdersAsCSV(
    $startDate: DateTime
    $endDate: DateTime
    $status: OrderStatus
    $customerId: ID
    $userId: ID
  ) {
    exportOrdersAsCSV(
      startDate: $startDate
      endDate: $endDate
      status: $status
      customerId: $customerId
      userId: $userId
    )
  }
`;