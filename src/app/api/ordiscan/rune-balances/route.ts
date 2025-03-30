import { NextRequest, NextResponse } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneBalance } from '@/types/ordiscan';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
  }

  try {
    const ordiscan = getOrdiscanClient();
    const balances: RuneBalance[] = await ordiscan.address.getRunes({ address });
    const validBalances: RuneBalance[] = Array.isArray(balances) ? balances : [];
    return NextResponse.json(validBalances);

  } catch (error) {
    console.error(`[API Route] Error fetching Rune balances for ${address}:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch Rune balances';
    return NextResponse.json({ error: 'Failed to fetch Rune balances', details: message }, { status: 500 });
  }
} 