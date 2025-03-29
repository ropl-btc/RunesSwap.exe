import { NextRequest, NextResponse } from 'next/server';
import { Ordiscan } from 'ordiscan';

// Define local RuneInfo type matching the one in the lib (or import from shared location)
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Rune name parameter is required' }, { status: 400 });
  }

  // --- Server-side Initialization ---
  const apiKey = process.env.ORDISCAN_API_KEY;
  if (!apiKey) {
    console.error("Ordiscan API key not found on server. Please set ORDISCAN_API_KEY environment variable.");
    return NextResponse.json({ error: 'Server configuration error: Missing Ordiscan API Key' }, { status: 500 });
  }
  const ordiscan = new Ordiscan(apiKey);
  // --- End Server-side Initialization ---

  // Ensure name doesn't have spacers for the API call
  const formattedName = name.replace(/•/g, '');

  try {
    const info: RuneInfo = await ordiscan.rune.getInfo({ name: formattedName });
    return NextResponse.json(info);

  } catch (error: unknown) {
    // Ordiscan might throw 404 as an error, check for that
    let status = 0;
    if (error && typeof error === 'object' && 'status' in error) {
        status = (error as { status: number }).status;
    }
    if (status === 404) {
        console.warn(`[API Route] Rune info not found for ${formattedName}.`);
        // Return null in the response body for 404, with a 404 status
        return NextResponse.json(null, { status: 404 }); 
    }
    console.error(`[API Route] Error fetching info for rune ${formattedName}:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch Rune Info';
    return NextResponse.json({ error: 'Failed to fetch Rune Info', details: message }, { status: 500 });
  }
} 