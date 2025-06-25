import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@apollo/client';
import { GET_SETTINGS } from '../../apollo/queries/settingsQueries';
import './QuotationPrintLayout.css'; // Import the CSS


interface SettingsData {
  companyName?: string;
  address?: string;
  phone?: string;
  receiptShowLogo?: boolean; 
  receiptHeader?: string;   
  receiptFooter?: string;   
  displayCurrency?: string;
  baseCurrency?: string; 
}

interface QuotationData {
    quoteNumber: string;
    createdAt: string;
    validUntil: string;
    subTotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    notes?: string;
    customer?: { name: string; address?: string; email?: string; };
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
    }[];
}

interface QuotationPrintLayoutProps {
  quote: QuotationData | null;
}

const QuotationPrintLayout: React.FC<QuotationPrintLayoutProps> = ({ quote }) => {
  const { data: settingsData } = useQuery<{ settings: SettingsData }>(GET_SETTINGS);
  const settings = settingsData?.settings;

  const currencySymbol = useMemo(() => {
          return settingsData?.settings.displayCurrency || settingsData?.settings.baseCurrency || '$';
        }, [settingsData]);

  if (!quote) return null;

  return (
    <div className="quotation-page">
      <h1>Quotation</h1>
      
      <header className="quote-header">
        <div className="company-details">
          {/* {settings?.logoUrl && <img src={settings.logoUrl} alt="Company Logo" />} */}
          <p><strong>{settings?.companyName || 'Your Company'}</strong></p>
          <p style={{ whiteSpace: 'pre-line' }}>{settings?.address}</p>
        </div>
        <div className="quote-details">
          <p><strong>Quote No.:</strong> {quote.quoteNumber}</p>
          <p><strong>Date Issued:</strong> {dayjs(quote.createdAt).format('YYYY-MM-DD')}</p>
          <p><strong>Valid Until:</strong> {dayjs(quote.validUntil).format('YYYY-MM-DD')}</p>
        </div>
      </header>

      {quote.customer && (
        <div className="customer-details">
          <h2>Billed To:</h2>
          <p><strong>{quote.customer.name}</strong></p>
          <p style={{ whiteSpace: 'pre-line' }}>{quote.customer.address}</p>
          <p>{quote.customer.email}</p>
        </div>
      )}
      
      <h2>Items</h2>
      <table className="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th className="col-qty">Qty</th>
            <th className="col-price">Unit Price</th>
            <th className="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item.description}</td>
              <td className="col-qty">{item.quantity}</td>
              <td className="col-price">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
              <td className="col-total">{currencySymbol}{item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary-section">
        <table className="summary-table">
            <tbody>
                <tr>
                    <td className="summary-label">Subtotal:</td>
                    <td className="summary-value">{currencySymbol}{quote.subTotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td className="summary-label">Discount:</td>
                    <td className="summary-value">-{currencySymbol}{quote.discountAmount.toFixed(2)}</td>
                </tr>
                <tr>
                    <td className="summary-label">Tax:</td>
                    <td className="summary-value">{currencySymbol}{quote.taxAmount.toFixed(2)}</td>
                </tr>
                <tr className="grand-total">
                    <td className="summary-label">Grand Total:</td>
                    <td className="summary-value">{currencySymbol}{quote.grandTotal.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
      </div>

      {quote.notes && (
          <div className="notes-section">
              <h2>Notes</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{quote.notes}</p>
          </div>
      )}

      <footer className="quote-footer">
        <p>If you have any questions, please contact us.</p>
        <p>{settings?.companyName || 'Your Company'}</p>
      </footer>
    </div>
  );
};

export default QuotationPrintLayout;
