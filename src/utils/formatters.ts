import { safeArrayFirst } from './typeGuards';

// Function to truncate TXIDs for display
export const truncateTxid = (txid: string, length: number = 8): string => {
  if (!txid) return '';
  if (txid.length <= length * 2 + 3) return txid;
  return `${txid.substring(0, length)}...${txid.substring(txid.length - length)}`;
};

// Function to format large number strings with commas
export function formatNumberString(
  numStr: string | undefined | null,
  defaultDisplay = 'N/A',
): string {
  if (!numStr) return defaultDisplay;

  try {
    // Remove any existing commas and validate the string contains only digits
    // and an optional decimal part. This avoids precision issues with
    // `parseFloat` on very large numbers.
    const cleaned = String(numStr).replace(/,/g, '');
    const isNegative = cleaned.startsWith('-');
    const numericPart = isNegative ? cleaned.slice(1) : cleaned;
    if (!/^\d+(\.\d+)?$/.test(numericPart)) return defaultDisplay;

    const parts = numericPart.split('.');
    const intPart = safeArrayFirst(parts);
    if (!intPart) return defaultDisplay;
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const decPart = parts[1];
    const result = decPart ? `${withCommas}.${decPart}` : withCommas;
    return isNegative ? `-${result}` : result;
  } catch {
    return defaultDisplay;
  }
}

export function formatNumber(value: number): string {
  if (value === 0) return '0';
  const str = value.toString();
  const parts = str.split('.');
  const intPart = safeArrayFirst(parts);
  if (!intPart) return '0';

  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decPart = parts[1]; // Safe to access since we know parts has at least 1 element
  return decPart ? `${withCommas}.${decPart}` : withCommas;
}
