/**
 * Formats a number as a currency string using the browser's internationalization API.
 * This ensures correct formatting for different currencies and locales.
 * * @param amount The number to format.
 * @param currencyCode The 3-letter ISO 4217 currency code (e.g., 'USD', 'MVR', 'EUR').
 * @returns A formatted currency string (e.g., "$1,234.50", "MVR 1,234.50").
 */
export const formatCurrency = (
    amount: number | null | undefined, 
    currencyCode: string | null | undefined
): string => {
  const numAmount = Number(amount);
  if (isNaN(numAmount)) {
    // Return a default value for invalid numbers
    return 'N/A';
  }

  const code = currencyCode || 'USD'; // Default to USD if no code is provided

  try {
    return new Intl.NumberFormat(undefined, { // 'undefined' uses the browser's locale for number formatting
      style: 'currency',
      currency: code,
    }).format(numAmount);
  } catch (e) {
    // Fallback for invalid currency codes
    return `${code} ${numAmount.toFixed(2)}`;
  }
};