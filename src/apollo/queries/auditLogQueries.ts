import { gql } from '@apollo/client';

export const GET_AUDIT_LOGS = gql`
  query GetAuditLogs(
    $userId: ID
    $action: AuditLogAction
    $entity: String
    $startDate: DateTime
    $endDate: DateTime
  ) {
    auditLogs(
      userId: $userId
      action: $action
      entity: $entity
      startDate: $startDate
      endDate: $endDate
    ) {
      id
      action
      entity
      entityId
      userEmail
      details
      createdAt
      user {
        id
        name
      }
    }
  }
`;

// We'll also need a query to get a list of users to filter by
export const GET_USERS_FOR_FILTER = gql`
    query GetUsersForFilter {
        users {
            id
            name
            email
        }
    }
`;