import { NextRequest, NextResponse } from 'next/server';
import type { GetPSBTParams, RuneOrder } from 'satsterminal-sdk';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { z } from 'zod';

// Create a comprehensive RuneOrder schema based on the SDK requirements
const runeOrderSchema = z.object({
  id: z.string().min(1, "Order ID is required"),
  market: z.string().min(1, "Market is required"),
  price: z.number().optional(),
  quantity: z.number().optional(),
  maker: z.string().optional(),
  side: z.enum(["BUY", "SELL"]).optional(),
  txid: z.string().optional(),
  vout: z.number().optional(),
  runeName: z.string().optional(),
  runeAmount: z.number().optional(),
  btcAmount: z.number().optional(),
  satPrice: z.number().optional(),
  status: z.string().optional(),
  timestamp: z.number().optional(),
}).passthrough(); // Use passthrough to allow additional fields expected by the SDK

const getPsbtParamsSchema = z.object({
  orders: z.array(runeOrderSchema),
  address: z.string().min(1, "Bitcoin address is required"),
  publicKey: z.string().min(1, "Public key is required"),
  paymentAddress: z.string().min(1, "Payment address is required"),
  paymentPublicKey: z.string().min(1, "Payment public key is required"),
  runeName: z.string().min(1, "Rune name is required"),
  sell: z.boolean().optional(),
  rbfProtection: z.boolean().optional(),
  feeRate: z.number().optional(),
  slippage: z.number().optional(),
});

export async function POST(request: NextRequest) {
  let params;
  try {
    params = await request.json();
  } catch {
    return NextResponse.json({ 
      error: 'Invalid JSON body', 
      details: 'The request body could not be parsed as JSON' 
    }, { status: 400 });
  }

  const validationResult = getPsbtParamsSchema.safeParse(params);

  if (!validationResult.success) {
    console.error("PSBT API Validation Error:", validationResult.error.flatten()); // Log detailed error server-side
    return NextResponse.json({
        error: 'Invalid request body for PSBT creation.',
        details: validationResult.error.flatten().fieldErrors
    }, { status: 400 });
  }

  // Use the validated and typed data from now on
  const validatedParams = validationResult.data;

  try {
    const terminal = getSatsTerminalClient();
    // Need to cast orders to RuneOrder[] since Zod validation may not fully match SDK type
    const psbtParams: GetPSBTParams = {
      ...validatedParams,
      orders: validatedParams.orders as unknown as RuneOrder[],
    };

    const psbtResponse = await terminal.getPSBT(psbtParams);
    return NextResponse.json(psbtResponse);

  } catch (error) {
    console.error(`Error getting PSBT on server:`, error);
    const message = (error instanceof Error) ? error.message : 'Failed to generate PSBT';
    
    // Check for specific API errors 
    let statusCode = 500;
    if (message.includes("Quote expired") || (error && typeof error === 'object' && (error as { code?: string }).code === 'ERR677K3')) {
      statusCode = 410; // Gone (or another suitable code for expired quotes)
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate PSBT', 
      details: message,
      code: (error && typeof error === 'object' && (error as { code?: string }).code) || 'UNKNOWN_ERROR'
    }, { status: statusCode });
  }
} 