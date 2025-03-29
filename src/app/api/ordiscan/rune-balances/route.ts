import { NextRequest, NextResponse } from 'next/server';
import { Ordiscan, type RuneBalance as OrdiscanRuneBalance } from 'ordiscan';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
  }

  // --- Server-side Initialization ---
  const apiKey = process.env.ORDISCAN_API_KEY;
  if (!apiKey) {
    console.error("Ordiscan API key not found on server. Please set ORDISCAN_API_KEY environment variable.");
    return NextResponse.json({ error: 'Server configuration error: Missing Ordiscan API Key' }, { status: 500 });
  }
  const ordiscan = new Ordiscan(apiKey);
  // --- End Server-side Initialization ---

  try {
    const balances: OrdiscanRuneBalance[] = await ordiscan.address.getRunes({ address });
    const validBalances = Array.isArray(balances) ? balances : [];
    return NextResponse.json(validBalances);

  } catch (error) {
    console.error(`[API Route] Error fetching Rune balances for ${address}:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch Rune balances';
    return NextResponse.json({ error: 'Failed to fetch Rune balances', details: message }, { status: 500 });
  }
} 