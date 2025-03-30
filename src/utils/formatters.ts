// Function to truncate TXIDs for display
export const truncateTxid = (txid: string, length: number = 8): string => {
  if (!txid) return '';
  if (txid.length <= length * 2 + 3) return txid;
  return `${txid.substring(0, length)}...${txid.substring(txid.length - length)}`;
};

// Function to format large number strings with commas
export const formatNumberString = (numStr: string | null | undefined): string => {
  if (numStr === null || numStr === undefined || numStr === '') return 'N/A';
  try {
    // Use BigInt for potentially very large supply/cap numbers
    const num = BigInt(numStr);
    return num.toLocaleString();
  } catch (error) {
    console.error("Error formatting number string:", numStr, error);
    return numStr; // Return original string if formatting fails
  }
}; 