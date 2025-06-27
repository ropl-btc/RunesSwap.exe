// Number formatting helpers

// Reuse a single NumberFormat instance for consistent formatting
const numberFormatter = new Intl.NumberFormat('en-US');

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
  if (numStr === undefined || numStr === null || numStr === '') {
    return defaultDisplay;
  }

  try {
    const cleaned = String(numStr).replace(/,/g, '');
    const isNegative = cleaned.startsWith('-');
    const numericPart = isNegative ? cleaned.slice(1) : cleaned;
    const match = /^(\d+)(?:\.(\d+))?$/.exec(numericPart);
    if (!match) return defaultDisplay;

    const intPart = match[1];
    const decPart = match[2];
    const formattedInt = numberFormatter.format(BigInt(intPart));
    const result = decPart ? `${formattedInt}.${decPart}` : formattedInt;
    return isNegative ? `-${result}` : result;
  } catch {
    return defaultDisplay;
  }
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
