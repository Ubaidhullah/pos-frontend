import { gql } from '@apollo/client';

export const CREATE_PURCHASE_ORDER = gql`
  mutation CreatePurchaseOrder($createPurchaseOrderInput: CreatePurchaseOrderInput!) {
    createPurchaseOrder(createPurchaseOrderInput: $createPurchaseOrderInput) {
      id
      poNumber
      status
      totalAmount
    }
  }
`;

// For updating DRAFT POs - assuming UpdatePurchaseOrderInput allows changing header and items
export const UPDATE_DRAFT_PURCHASE_ORDER = gql`
  mutation UpdateDraftPurchaseOrder($id: ID!, $updatePurchaseOrderInput: UpdatePurchaseOrderInput!) {
    updateDraftPurchaseOrder(id: $id, updatePurchaseOrderInput: $updatePurchaseOrderInput) {
      id
      poNumber
      status
      totalAmount
    }
  }
`;

export const UPDATE_PURCHASE_ORDER_STATUS = gql`
  mutation UpdatePurchaseOrderStatus($updatePurchaseOrderStatusInput: UpdatePurchaseOrderStatusInput!) {
    updatePurchaseOrderStatus(updatePurchaseOrderStatusInput: $updatePurchaseOrderStatusInput) {
      id
      status
    }
  }
`;

export const RECEIVE_PURCHASE_ORDER_ITEMS = gql`
  mutation ReceivePurchaseOrderItems($receivePurchaseOrderItemsInput: ReceivePurchaseOrderItemsInput!) {
    receivePurchaseOrderItems(receivePurchaseOrderItemsInput: $receivePurchaseOrderItemsInput) {
      id
      status
      items {
        id
        quantityReceived
      }
    }
  }
`;