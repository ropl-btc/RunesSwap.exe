import { NextResponse } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneInfo } from '@/types/ordiscan'; // Import from shared types

export async function GET() {
  try {
    const ordiscan = getOrdiscanClient();
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