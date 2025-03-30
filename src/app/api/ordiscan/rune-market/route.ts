import { NextRequest, NextResponse } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneMarketInfo } from '@/types/ordiscan'; // Import from shared types

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Rune name parameter is required' }, { status: 400 });
  }

  // Ensure name doesn't have spacers for the API call
  const formattedName = name.replace(/•/g, '');

  try {
    const ordiscan = getOrdiscanClient();
    const marketInfo: RuneMarketInfo = await ordiscan.rune.getMarketInfo({ name: formattedName });
    return NextResponse.json(marketInfo);

  } catch (error: unknown) {
    // Ordiscan might throw 404 as an error, check for that
    let status = 0;
    if (error && typeof error === 'object' && 'status' in error) {
        status = (error as { status: number }).status;
    }
    if (status === 404) {
        console.warn(`[API Route] Rune market info not found for ${formattedName}.`);
        // Return null in the response body for 404, with a 404 status
        return NextResponse.json(null, { status: 404 }); 
    }
    console.error(`[API Route] Error fetching market info for rune ${formattedName}:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch Rune Market Info';
    return NextResponse.json({ error: 'Failed to fetch Rune Market Info', details: message }, { status: 500 });
  }
} 