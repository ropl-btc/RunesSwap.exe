import { NextRequest, NextResponse } from 'next/server';
import { SatsTerminal, type GetPSBTParams, type RuneOrder } from 'satsterminal-sdk';

// Basic validation helper
function validateGetPsbtParams(params: any): params is GetPSBTParams {
  return (
    Array.isArray(params.orders) &&
    typeof params.address === 'string' &&
    typeof params.publicKey === 'string' &&
    typeof params.paymentAddress === 'string' &&
    typeof params.paymentPublicKey === 'string' &&
    typeof params.runeName === 'string' &&
    (params.sell === undefined || typeof params.sell === 'boolean')
    // Add more checks for optional fields if needed
  );
}

export async function POST(request: NextRequest) {
  let params;
  try {
    params = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required parameters
  if (!validateGetPsbtParams(params)) {
    return NextResponse.json({ error: 'Missing or invalid required parameters for getPSBT' }, { status: 400 });
  }

  // --- Server-side Initialization ---
  const apiKey = process.env.SATS_TERMINAL_API_KEY;
  if (!apiKey) {
    console.error("SatsTerminal API key not found on server. Please set SATS_TERMINAL_API_KEY environment variable.");
    return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
  }
  const terminal = new SatsTerminal({ apiKey });
  // --- End Server-side Initialization ---

  try {
    // Ensure orders are properly typed before sending (though validation helps)
    const psbtParams: GetPSBTParams = {
      ...params,
      orders: params.orders as RuneOrder[], // Cast after validation
    };

    const psbtResponse = await terminal.getPSBT(psbtParams);
    // Important: The response structure might vary (e.g., psbt vs psbtBase64)
    // Client needs to handle potential variations
    return NextResponse.json(psbtResponse);

  } catch (error) {
    console.error(`Error getting PSBT on server:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to generate PSBT';
    return NextResponse.json({ error: 'Failed to generate PSBT', details: message }, { status: 500 });
  }
} 