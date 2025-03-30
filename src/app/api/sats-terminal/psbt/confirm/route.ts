import { NextRequest, NextResponse } from 'next/server';
import type { ConfirmPSBTParams, RuneOrder } from 'satsterminal-sdk';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { z } from 'zod';

const runeOrderSchema = z.object({
  id: z.string(),
  // Other RuneOrder fields would be defined here
  // Since we don't have the full RuneOrder type details, using a more permissive approach
}).passthrough(); // Allow other fields that might be in RuneOrder

const confirmPsbtParamsSchema = z.object({
  orders: z.array(runeOrderSchema),
  address: z.string().min(1),
  publicKey: z.string().min(1),
  paymentAddress: z.string().min(1),
  paymentPublicKey: z.string().min(1),
  signedPsbtBase64: z.string().min(1),
  swapId: z.string().min(1),
  runeName: z.string().min(1),
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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
    // Ensure orders are properly typed
    const confirmParams: ConfirmPSBTParams = {
      ...validatedParams,
      orders: validatedParams.orders as unknown as RuneOrder[],
      // Ensure optional signedRbfPsbtBase64 is undefined if not provided, matching SDK type
      signedRbfPsbtBase64: validatedParams.signedRbfPsbtBase64 || undefined,
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