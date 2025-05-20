// Function to truncate TXIDs for display
export const truncateTxid = (txid: string, length: number = 8): string => {
  if (!txid) return "";
  if (txid.length <= length * 2 + 3) return txid;
  return `${txid.substring(0, length)}...${txid.substring(txid.length - length)}`;
};

// Function to format large number strings with commas
export function formatNumberString(
  numStr: string | undefined | null,
  defaultDisplay = "N/A",
): string {
  if (!numStr) return defaultDisplay;

  try {
    // Remove any existing commas and validate the string contains only digits
    // and an optional decimal part. This avoids precision issues with
    // `parseFloat` on very large numbers.
    const cleaned = String(numStr).replace(/,/g, "");
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return defaultDisplay;

    const [intPart, decPart] = cleaned.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart ? `${withCommas}.${decPart}` : withCommas;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return defaultDisplay;
  }
}
