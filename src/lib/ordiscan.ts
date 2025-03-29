import { Ordiscan } from 'ordiscan';
import type { Utxo as OrdiscanUtxo, RuneBalance as OrdiscanRuneBalance } from 'ordiscan'; // Import types from the package

const ORDISCAN_API_BASE = 'https://api.ordiscan.com';
const API_KEY = process.env.NEXT_PUBLIC_ORDISCAN_API_KEY;

if (!API_KEY) {
  console.warn("Ordiscan API key not found. Please set NEXT_PUBLIC_ORDISCAN_API_KEY environment variable.");
}

// Initialize Ordiscan client
// We handle the missing API key check within each function to allow initialization
const ordiscan = new Ordiscan(API_KEY || '');

// Re-export the RuneBalance type from the SDK for consistency if needed elsewhere
export type RuneBalance = OrdiscanRuneBalance;

// Define local RuneInfo type based on Ordiscan docs for GET /v1/rune/{name}
export interface RuneInfo {
  id: string;
  name: string;
  formatted_name: string;
  number: number;
  inscription_id: string | null;
  decimals: number; // <-- The crucial field
  symbol: string | null; // Allow null based on linter error
  etching_txid: string | null;
  timestamp_unix: string | null;
  premined_supply: string;
  amount_per_mint: string | null;
  mint_count_cap: string | null;
  mint_start_block: number | null;
  mint_end_block: number | null;
  current_supply?: string; // Make optional based on linter error
  current_mint_count?: number; // Make optional based on linter error
  // Add other fields from docs if needed
}

// --- New Types for Address Rune Activity ---
export interface RunestoneMessage {
  rune: string;
  type: 'ETCH' | 'MINT' | 'TRANSFER';
}

interface RunicInput {
  address: string;
  output: string; // txid:vout
  rune: string;
  rune_amount: string;
}

interface RunicOutput {
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

// --- Removed client-side functions and SDK initialization ---
// getBtcBalance removed
// getRuneBalances removed
// getRuneInfo removed
// getListRunes removed
// getAddressRuneActivity removed
// Ordiscan client initialization removed
// API_KEY constant removed 