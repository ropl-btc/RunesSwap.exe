import { NextRequest, NextResponse } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils'; // <-- Import client utility
// Import the necessary types from the shared location
import { RuneActivityEvent } from '@/types/ordiscan';

// Define local types matching the ones in the lib (or import from shared location)
// Commented out to avoid linter errors - might use later
// interface RunestoneMessage {
//   rune: string;
//   type: 'ETCH' | 'MINT' | 'TRANSFER';
// }

// Commented out to avoid linter errors - might use later
// interface RunicInput {
//   address: string;
//   rune: string | null;
//   rune_amount: string;
// }

// Commented out to avoid linter errors - might use later
// interface RunicOutput {
//   address: string;
//   rune: string | null;
//   rune_amount: string;
// }

// Commented out to avoid linter errors
// const ORDISCAN_API_BASE = 'https://api.ordiscan.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: "Address parameter is required" }, { status: 400 });
  }

  // const apiKey = process.env.ORDISCAN_API_KEY;
  // if (!apiKey) {
  //   console.error("[API /rune-activity] Ordiscan API key is not set");
  //   return NextResponse.json({ error: "Server configuration error: API key missing" }, { status: 500 });
  // }

  // const apiUrl = `https://api.ordiscan.com/v1/address/${address}/activity/runes`;

  try {
    const ordiscan = getOrdiscanClient(); // <-- Use utility function

    // Use the method suggested by the linter
    const activity: RuneActivityEvent[] = await ordiscan.address.getRunesActivity({ address }); // <-- Corrected method name

    // Return the data received from the SDK
    return NextResponse.json(activity);

    // Remove old fetch logic:
    // const apiResponse = await fetch(apiUrl, {
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //   },
    // });
    // ... removed response handling and parsing ...

  } catch (error) {
    console.error(`[API /rune-activity] Error calling Ordiscan SDK for address ${address}:`, error);
    // Use a more generic error message as SDK might throw various errors
    const message = (error instanceof Error) ? error.message : 'Failed to fetch rune activity via SDK';
    // Check for potential 404 or other specific statuses if the SDK surfaces them
    let status = 500;
    if (error && typeof error === 'object' && 'status' in error) {
      status = (error as { status: number }).status; // Use status from SDK error if available
    }
    return NextResponse.json({ error: "Failed to fetch rune activity", details: message }, { status });
  }
} 