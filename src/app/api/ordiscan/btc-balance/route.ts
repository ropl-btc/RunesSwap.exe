import { NextRequest, NextResponse } from 'next/server';
import { Ordiscan } from 'ordiscan';

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
    // Use the original logic from src/lib/ordiscan.ts
    const utxos = await ordiscan.address.getUtxos({ address });

    if (!Array.isArray(utxos)) {
       console.warn(`[API Route] Invalid or empty UTXO data received for address ${address}. Expected array, got:`, utxos);
       // Return 0 balance if data is invalid
       return NextResponse.json({ balance: 0 }); 
    }

    const totalBalance = utxos.reduce((sum, utxo) => sum + (utxo.value || 0), 0);
    return NextResponse.json({ balance: totalBalance });

  } catch (error) {
    console.error(`[API Route] Error fetching UTXOs for ${address}:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch BTC balance';
    return NextResponse.json({ error: 'Failed to fetch BTC balance', details: message }, { status: 500 });
  }
} 