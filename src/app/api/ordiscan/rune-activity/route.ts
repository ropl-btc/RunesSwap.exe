import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils'; // <-- Import client utility
// Import the necessary types from the shared location
import { RuneActivityEvent } from '@/types/ordiscan';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';
import { z } from 'zod';

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

  // Zod validation for 'address'
  const schema = z.object({ address: z.string().min(1) });
  const validation = schema.safeParse({ address });
  if (!validation.success) {
    return createErrorResponse('Invalid query parameter', validation.error.message, 400);
  }
  const { address: validAddress } = validation.data;

  // const apiKey = process.env.ORDISCAN_API_KEY;
  // if (!apiKey) {
  //   console.error("[API /rune-activity] Ordiscan API key is not set");
  //   return NextResponse.json({ error: "Server configuration error: API key missing" }, { status: 500 });
  // }

  // const apiUrl = `https://api.ordiscan.com/v1/address/${address}/activity/runes`;

  try {
    const ordiscan = getOrdiscanClient(); // <-- Use utility function

    // Use the method suggested by the linter
    const activity: RuneActivityEvent[] = await ordiscan.address.getRunesActivity({ address: validAddress }); // <-- Corrected method name

    // Ensure we always return a valid array
    const validActivity = Array.isArray(activity) ? activity : [];
    
    return createSuccessResponse(validActivity);

    // Remove old fetch logic:
    // const apiResponse = await fetch(apiUrl, {
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //   },
    // });
    // ... removed response handling and parsing ...

  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to fetch rune activity for address ${validAddress}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 