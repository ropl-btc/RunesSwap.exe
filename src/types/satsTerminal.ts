/**
 * Types related to SatsTerminal SDK interactions and API responses.
 */

export interface Rune {
  id: string;
  name: string;
  imageURI?: string;
  formattedAmount?: string;
  formattedUnitPrice?: string;
  price?: number; // This might come from SatsTerminal or be enriched from Ordiscan
}

// Add other SatsTerminal specific types here as needed, e.g.:
// export interface SatsTerminalQuote {
//   ...
// } 