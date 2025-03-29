import { NextRequest, NextResponse } from 'next/server';
import { SatsTerminal, type QuoteParams } from 'satsterminal-sdk';

// Helper function to validate parameters (basic example)
function validateQuoteParams(params: unknown): params is Omit<QuoteParams, 'btcAmount'> & { btcAmount: string | number } {
  if (!params || typeof params !== 'object') return false;
  const p = params as Record<string, unknown>;
  
  return (
    (typeof p.btcAmount === 'string' || typeof p.btcAmount === 'number') && // btcAmount is required and should be string/number
    typeof p.runeName === 'string' &&
    typeof p.address === 'string' &&
    (p.sell === undefined || typeof p.sell === 'boolean')
    // Add more checks as needed for marketplaces, rbfProtection etc.
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
  if (!validateQuoteParams(params)) {
    return NextResponse.json({ error: 'Missing or invalid required parameters for quote' }, { status: 400 });
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
    // Ensure btcAmount is a string for the SDK
    const quoteParams: QuoteParams = {
      ...params,
      btcAmount: String(params.btcAmount),
    };

    const quoteResponse = await terminal.fetchQuote(quoteParams);
    return NextResponse.json(quoteResponse);

  } catch (error) {
    console.error(`Error fetching quote on server:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to fetch quote';
    // Forward specific error messages if safe, otherwise generic error
    const statusCode = message.includes('liquidity') ? 404 : 500;
    return NextResponse.json({ error: 'Failed to fetch quote', details: message }, { status: statusCode });
  }
} 