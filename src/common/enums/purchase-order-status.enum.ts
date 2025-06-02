export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED', // Approved, ready to be sent
  SENT = 'SENT',         // Sent to supplier
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',   // All items received
  CANCELLED = 'CANCELLED',
}