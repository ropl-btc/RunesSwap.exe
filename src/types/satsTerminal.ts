/**
 * Types related to SatsTerminal SDK interactions and API responses.
 */

import { z } from 'zod';

export interface Rune {
  id: string;
  name: string;
  imageURI: string; // Made required for type safety
  formattedAmount?: string | undefined;
  formattedUnitPrice?: string | undefined;
  price?: number | undefined; // This might come from SatsTerminal or be enriched from Ordiscan
}

// Add other SatsTerminal specific types here as needed, e.g.:
// export interface SatsTerminalQuote {
//   ...
// }

export const runeOrderSchema = z
  .object({
    id: z.string().min(1, 'Order ID is required'),
    market: z.string().min(1, 'Market is required'),
    price: z.number(),
    formattedAmount: z.number(),
    fromTokenAmount: z.string().optional(),
    slippage: z.number().optional(),
    listingAmount: z.number().optional(),
    sellerAddress: z.string().optional(),
    tokenAmount: z.string().optional(),
    listingPrice: z.string().optional(),
    updatedAt: z.string().optional(),
    formattedUnitPrice: z.string().optional(),
    alkanesId: z.string().optional(),
    name: z.string().optional(),
    amount: z.string().optional(),
  })
  .passthrough();

// Define the RuneOrder type to match the actual SatsTerminal SDK Order interface
export interface RuneOrder {
  id: string;
  market: string;
  price: number;
  formattedAmount: number;
  fromTokenAmount?: string | undefined;
  slippage?: number | undefined;
  listingAmount?: number | undefined;
  sellerAddress?: string | undefined;
  tokenAmount?: string | undefined;
  listingPrice?: string | undefined;
  updatedAt?: string | undefined;
  formattedUnitPrice?: string | undefined;
  alkanesId?: string | undefined;
  name?: string | undefined;
  amount?: string | undefined;
}
