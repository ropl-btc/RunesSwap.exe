// Function to truncate TXIDs for display
export const truncateTxid = (txid: string, length: number = 8): string => {
  if (!txid) return '';
  if (txid.length <= length * 2 + 3) return txid;
  return `${txid.substring(0, length)}...${txid.substring(txid.length - length)}`;
};

// Function to format large number strings with commas
export function formatNumberString(numStr: string | undefined | null, defaultDisplay = 'N/A'): string {
  if (!numStr) return defaultDisplay;

  try {
    // Parse the number string
    const num = parseFloat(numStr);
    if (isNaN(num)) return defaultDisplay;

    // Format with commas for thousands separator
    return num.toLocaleString();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return defaultDisplay;
  }
}