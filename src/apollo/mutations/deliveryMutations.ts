import { gql } from '@apollo/client';

export const CREATE_DELIVERY_FROM_ORDER = gql`
  mutation CreateDeliveryFromOrder($createDeliveryInput: CreateDeliveryInput!) {
    createDeliveryFromOrder(createDeliveryInput: $createDeliveryInput) {
      id
      deliveryNumber
    }
  }
`;

export const UPDATE_DELIVERY_STATUS = gql`
  mutation UpdateDeliveryStatus($updateDeliveryStatusInput: UpdateDeliveryStatusInput!) {
    updateDeliveryStatus(updateDeliveryStatusInput: $updateDeliveryStatusInput) {
      id
      status
    }
  }
`;

export const ASSIGN_DRIVER_TO_DELIVERY = gql`
  mutation AssignDriverToDelivery($assignDriverInput: AssignDriverInput!) {
    assignDriverToDelivery(assignDriverInput: $assignDriverInput) {
      id
      driver {
        id
        name
      }
    }
  }
`;