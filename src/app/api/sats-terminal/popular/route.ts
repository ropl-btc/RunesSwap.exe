import { NextRequest, NextResponse } from 'next/server';
import { SatsTerminal } from 'satsterminal-sdk';

export async function GET(request: NextRequest) {

  // --- Server-side Initialization ---
  const apiKey = process.env.SATS_TERMINAL_API_KEY;
  if (!apiKey) {
    console.error("SatsTerminal API key not found on server. Please set SATS_TERMINAL_API_KEY environment variable.");
    return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
  }
  const terminal = new SatsTerminal({ apiKey });
  // --- End Server-side Initialization ---

  try {
    // No parameters needed for popularCollections based on current usage
    const popularResponse = await terminal.popularCollections({}); 
    return NextResponse.json(popularResponse);

  } catch (error) {
    console.error(`Error fetching popular collections on server:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch popular collections';
    return NextResponse.json({ error: 'Failed to fetch popular collections', details: message }, { status: 500 });
  }
} 