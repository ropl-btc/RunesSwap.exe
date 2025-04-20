import { NextRequest, NextResponse } from 'next/server';
import type { ConfirmPSBTParams, RuneOrder } from 'satsterminal-sdk';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { z } from 'zod';
import { handleApiError, createErrorResponse } from '@/lib/apiUtils';

// Create a more comprehensive RuneOrder schema based on observed usage
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

const confirmPsbtParamsSchema = z.object({
  orders: z.array(runeOrderSchema),
  address: z.string().min(1, "Bitcoin address is required"),
  publicKey: z.string().min(1, "Public key is required"),
  paymentAddress: z.string().min(1, "Payment address is required"),
  paymentPublicKey: z.string().min(1, "Payment public key is required"),
  signedPsbtBase64: z.string().min(1, "Signed PSBT is required"),
  swapId: z.string().min(1, "Swap ID is required"),
  runeName: z.string().min(1, "Rune name is required"),
  sell: z.boolean().optional(),
  rbfProtection: z.boolean().optional(),
  signedRbfPsbtBase64: z.string().optional(), // Make optional initially
}).refine(data => {
    // If rbfProtection is true, signedRbfPsbtBase64 must be a non-empty string
    if (data.rbfProtection === true) {
      return typeof data.signedRbfPsbtBase64 === 'string' && data.signedRbfPsbtBase64.length > 0;
    }
    return true; // Otherwise, validation passes regarding this rule
  }, {
    message: "signedRbfPsbtBase64 is required when rbfProtection is true",
    path: ["signedRbfPsbtBase64"], // Specify the path of the error
  });

export async function POST(request: NextRequest) {
  let params;
  try {
    params = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', details: 'The request body could not be parsed as JSON' }, { status: 400 });
  }

  const validationResult = confirmPsbtParamsSchema.safeParse(params);

  if (!validationResult.success) {
    console.error("Confirm PSBT API Validation Error:", validationResult.error.flatten()); // Log detailed error server-side
    return NextResponse.json({
        error: 'Invalid request body for PSBT confirmation.',
        details: validationResult.error.flatten().fieldErrors
    }, { status: 400 });
  }

  // Use the validated and typed data from now on
  const validatedParams = validationResult.data;

  try {
    const terminal = getSatsTerminalClient();
    // No need for type casting since validatedParams is already properly typed
    const confirmParams: ConfirmPSBTParams = {
      ...validatedParams,
      // Need to cast orders to RuneOrder[] since Zod validation may not fully match SDK type
      orders: validatedParams.orders as unknown as RuneOrder[],
      // Ensure optional signedRbfPsbtBase64 is undefined if not provided, matching SDK type
      signedRbfPsbtBase64: validatedParams.signedRbfPsbtBase64 || undefined,
    };

    const confirmResponse = await terminal.confirmPSBT(confirmParams);
    return NextResponse.json(confirmResponse);

  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to confirm PSBT');
    // Special handling for quote expired
    if (errorInfo.message.includes('Quote expired') || (error && typeof error === 'object' && (error as { code?: string }).code === 'ERR677K3')) {
      return createErrorResponse('Quote expired. Please fetch a new quote.', errorInfo.details, 410);
    }
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 