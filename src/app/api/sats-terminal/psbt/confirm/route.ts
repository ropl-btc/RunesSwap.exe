import { NextRequest, NextResponse } from 'next/server';
import { SatsTerminal, type ConfirmPSBTParams, type RuneOrder } from 'satsterminal-sdk';

// Basic validation helper
function validateConfirmPsbtParams(params: unknown): params is ConfirmPSBTParams {
  if (!params || typeof params !== 'object') return false;
  const p = params as Record<string, unknown>;
  
  return (
    Array.isArray(p.orders) &&
    typeof p.address === 'string' &&
    typeof p.publicKey === 'string' &&
    typeof p.paymentAddress === 'string' &&
    typeof p.paymentPublicKey === 'string' &&
    typeof p.signedPsbtBase64 === 'string' && // Main signed PSBT is required
    typeof p.swapId === 'string' &&
    typeof p.runeName === 'string' &&
    (p.sell === undefined || typeof p.sell === 'boolean') &&
    (p.rbfProtection === undefined || typeof p.rbfProtection === 'boolean') &&
    // signedRbfPsbtBase64 is optional, only required if rbfProtection is true
    (p.rbfProtection !== true || typeof p.signedRbfPsbtBase64 === 'string')
  );
}

export async function POST(request: NextRequest) {
  let params;
  try {
    params = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required parameters
  if (!validateConfirmPsbtParams(params)) {
    return NextResponse.json({ error: 'Missing or invalid required parameters for confirmPSBT' }, { status: 400 });
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
    // Ensure orders are properly typed
    const confirmParams: ConfirmPSBTParams = {
      ...params,
      orders: params.orders as RuneOrder[],
      // Ensure optional signedRbfPsbtBase64 is undefined if not provided, matching SDK type
      signedRbfPsbtBase64: params.signedRbfPsbtBase64 || undefined,
    };

    const confirmResponse = await terminal.confirmPSBT(confirmParams);
    return NextResponse.json(confirmResponse);

  } catch (error) {
    console.error(`Error confirming PSBT on server:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to confirm PSBT';
    // Check for specific API errors if needed, e.g., quote expired
    let statusCode = 500;
    if (message.includes("Quote expired") || (error && typeof error === 'object' && (error as { code?: string }).code === 'ERR677K3')) {
      statusCode = 410; // Gone (or another suitable code like 400 Bad Request)
    }
    return NextResponse.json({ error: 'Failed to confirm PSBT', details: message }, { status: statusCode });
  }
} 