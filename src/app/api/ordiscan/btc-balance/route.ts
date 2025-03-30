import { NextRequest, NextResponse } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
  }

  try {
    const ordiscan = getOrdiscanClient();
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