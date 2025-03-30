import { NextRequest, NextResponse } from 'next/server';
import type { QuoteParams } from 'satsterminal-sdk';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { z } from 'zod';

const quoteParamsSchema = z.object({
  btcAmount: z.union([z.string().min(1), z.number().positive()]).transform(val => String(val)), // Require non-empty string or positive number, always transform to string
  runeName: z.string().min(1),
  address: z.string().min(1),
  sell: z.boolean().optional(),
  // Add other optional fields from QuoteParams if needed, e.g.:
  // marketplaces: z.array(z.string()).optional(),
  // rbfProtection: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  let params;
  try {
    params = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = quoteParamsSchema.safeParse(params);

  if (!validationResult.success) {
    console.error("Quote API Validation Error:", validationResult.error.flatten()); // Log detailed error server-side
    return NextResponse.json({
        error: 'Invalid request body for quote.',
        details: validationResult.error.flatten().fieldErrors
    }, { status: 400 });
  }

  // Use the validated and typed data from now on
  const validatedParams = validationResult.data;

  try {
    const terminal = getSatsTerminalClient();
    // Ensure btcAmount is a string for the SDK
    const quoteParams: QuoteParams = {
      ...validatedParams,
      btcAmount: validatedParams.btcAmount,
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