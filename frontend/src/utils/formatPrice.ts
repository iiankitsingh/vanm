/**
 * Formats a flight offer price, converting EUR to INR at a fixed rate of 1 EUR = 91 INR
 */
export function formatPrice(amount: string | number, currency: string): string {
  let value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(value)) {
    return "₹0";
  }

  // Handle EUR to INR conversion for test environment
  if (currency === "EUR") {
    value = value * 91;
  }

  const roundedVal = Math.round(value);

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(roundedVal)}`;
}
