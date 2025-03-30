import { NextResponse } from 'next/server';
import { getSatsTerminalClient } from '@/lib/serverUtils';

export async function GET() {

  try {
    const terminal = getSatsTerminalClient();
    // No parameters needed for popularCollections based on current usage
    const popularResponse = await terminal.popularCollections({});
    return NextResponse.json(popularResponse);

  } catch (error) {
    console.error(`Error fetching popular collections on server:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch popular collections';
    return NextResponse.json({ error: 'Failed to fetch popular collections', details: message }, { status: 500 });
  }
} 