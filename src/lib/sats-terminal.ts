// Define types for rune responses - This might be moved to a shared types file later
// Used by fetchRunesFromApi in SwapInterface.tsx
export interface Rune {
  id: string;
  name: string;
  imageURI?: string;
  formattedAmount?: string;
  formattedUnitPrice?: string;
  price?: number;
}

// All SatsTerminal SDK calls should now go through /api/sats-terminal/* routes.
// The functions previously exported from this file (fetchQuote, getPSBT, etc.) 
// have been removed as they are handled by the API routes.
