import type { RuneBalance as OrdiscanRuneBalance } from 'ordiscan';

// Re-export the RuneBalance type from the SDK for consistency if needed elsewhere
export type RuneBalance = OrdiscanRuneBalance;

// Define local RuneInfo type based on Ordiscan docs for GET /v1/rune/{name}
export interface RuneInfo {
  id: string;
  name: string;
  formatted_name: string;
  number: number;
  inscription_id: string | null;
  decimals: number;
  symbol: string | null;
  etching_txid: string | null;
  timestamp_unix: string | null;
  premined_supply: string;
  amount_per_mint: string | null;
  mint_count_cap: string | null;
  mint_start_block: number | null;
  mint_end_block: number | null;
  current_supply?: string;
  current_mint_count?: number;
}

// Define market info type based on Ordiscan docs for GET /v1/rune/{name}/market
export interface RuneMarketInfo {
  price_in_sats: number;
  price_in_usd: number;
  market_cap_in_btc: number;
  market_cap_in_usd: number;
}

// --- Types for Address Rune Activity ---
export interface RunestoneMessage {
  rune: string;
  type: 'ETCH' | 'MINT' | 'TRANSFER';
}

export interface RunicInput {
  address: string;
  output: string; // txid:vout
  rune: string;
  rune_amount: string;
}

export interface RunicOutput {
  address: string;
  vout: number;
  rune: string;
  rune_amount: string;
}

export interface RuneActivityEvent {
  txid: string;
  runestone_messages: RunestoneMessage[];
  inputs: RunicInput[];
  outputs: RunicOutput[];
  timestamp: string; // ISO datetime string
} 