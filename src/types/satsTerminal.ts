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
    quantity: z.number().optional(),
    maker: z.string().optional(),
    side: z.enum(['BUY', 'SELL']).optional(),
    txid: z.string().optional(),
    vout: z.number().optional(),
    runeName: z.string().optional(),
    runeAmount: z.number().optional(),
    btcAmount: z.number().optional(),
    satPrice: z.number().optional(),
    status: z.string().optional(),
    timestamp: z.number().optional(),
  })
  .passthrough();

// Define the RuneOrder type directly with proper optional handling
export interface RuneOrder {
  id: string;
  market: string;
  price: number;
  formattedAmount: number;
  fromTokenAmount?: string | undefined;
  slippage?: number | undefined;
  quantity?: number | undefined;
  maker?: string | undefined;
  side?: 'BUY' | 'SELL' | undefined;
  txid?: string | undefined;
  vout?: number | undefined;
  runeName?: string | undefined;
  runeAmount?: number | undefined;
  btcAmount?: number | undefined;
  satPrice?: number | undefined;
  status?: string | undefined;
  timestamp?: number | undefined;
}
