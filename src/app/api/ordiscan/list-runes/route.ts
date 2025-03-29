import { NextResponse } from 'next/server';
import { Ordiscan } from 'ordiscan';

// Define local RuneInfo type matching the one used elsewhere
interface RuneInfo {
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

export async function GET() {
  // --- Server-side Initialization ---
  const apiKey = process.env.ORDISCAN_API_KEY;
  if (!apiKey) {
    console.error("Ordiscan API key not found on server. Please set ORDISCAN_API_KEY environment variable.");
    return NextResponse.json({ error: 'Server configuration error: Missing Ordiscan API Key' }, { status: 500 });
  }
  const ordiscan = new Ordiscan(apiKey);
  // --- End Server-side Initialization ---

  try {
    // Assuming the method is listRunes or similar based on GET /v1/runes
    // Fetch newest first
    const runes: RuneInfo[] = await ordiscan.rune.list({ sort: 'newest' }); 
    return NextResponse.json(Array.isArray(runes) ? runes : []);

  } catch (error) {
    console.error(`[API Route] Error fetching latest runes list:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch runes list';
    return NextResponse.json({ error: 'Failed to fetch runes list', details: message }, { status: 500 });
  }
} 