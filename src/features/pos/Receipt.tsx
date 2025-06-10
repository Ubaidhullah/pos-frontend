import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import './Receipt.css';

// ... (Your interfaces for ReceiptProps, OrderDataForReceipt, etc.) ...
interface SettingsData { companyName?: string;  address?: string; phone?: string; }

export interface OrderDataForReceipt {
    billNumber: string;
    createdAt: string;
    itemsTotal: number;
    grandTotal: number;
    amountPaid: number;
    changeGiven: number;
    user?: { name?: string; email: string };
    customer?: { name?: string };
    items: { product: { name: string }, quantity: number, priceAtSale: number, lineTotal: number }[];
    payments: { method: string, amount: number }[];
}

interface ReceiptProps {
  order: OrderDataForReceipt | null;
}


const Receipt: React.FC<ReceiptProps> = ({ order }) => {
  const { data: settingsData } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);

  // 👇 FIX #1: ADD THIS GUARD CLAUSE
  // If there's no order data yet, render nothing.
  if (!order) {
    return null;
  }

  const settings = settingsData?.settings;

  return (
    <div className="receipt-paper">
      <header className="receipt-header">
        {/* {settings?.logoUrl && <img src={settings.logoUrl} alt="Company Logo" />} */}
        <h1>{settings?.companyName || 'Your Company'}</h1>
        <p>{settings?.address || '123 Business Rd, Business City'}</p>
        <p>{settings?.phone || '555-1234'}</p>
      </header>

      {/* ... (rest of the component is fine) ... */}
      <section className="receipt-section receipt-info">
        {/* ... */}
      </section>

      <section className="receipt-section receipt-items">
        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th className="col-qty">Qty</th>
              <th className="col-item">Item</th>
              <th className="col-price">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* This .map() is now safe because we checked if 'order' exists */}
            {Array.isArray(order.items) && order.items.map((item, index) => (
              <tr key={index}>
                <td className="col-qty">{item.quantity}</td>
                <td className="col-item">{item.product.name}</td>
                <td className="col-price">${item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="receipt-section receipt-summary">
        {/* ... */}
      </section>
      
      <section className="receipt-section receipt-payments">
        <h2>Payments</h2>
         {/* This .map() is also safe now */}
        {Array.isArray(order.payments) && order.payments.map((payment, index) => (
          <div key={index} className="summary-row">
            <span>{payment.method.replace('_', ' ')}:</span>
            <span>${payment.amount.toFixed(2)}</span>
          </div>
        ))}
         <div className="summary-row">
          <span>Total Paid:</span>
          <span>${order.amountPaid.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span>Change Due:</span>
          <span>${order.changeGiven.toFixed(2)}</span>
        </div>
      </section>

      <footer className="receipt-footer">
        <p>Thank you for your business!</p>
      </footer>
    </div>
  );
};

export default Receipt;