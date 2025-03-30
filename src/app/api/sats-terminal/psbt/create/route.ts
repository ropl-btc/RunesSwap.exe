import { NextRequest, NextResponse } from 'next/server';
import type { GetPSBTParams, RuneOrder } from 'satsterminal-sdk';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { z } from 'zod';

const runeOrderSchema = z.object({
  id: z.string(),
  // Other RuneOrder fields would be defined here
  // Since we don't have the full RuneOrder type details, using a more permissive approach
  // If specific fields are known, they should be added here
}).passthrough(); // Allow other fields that might be in RuneOrder

const getPsbtParamsSchema = z.object({
  orders: z.array(runeOrderSchema),
  address: z.string().min(1),
  publicKey: z.string().min(1),
  paymentAddress: z.string().min(1),
  paymentPublicKey: z.string().min(1),
  runeName: z.string().min(1),
  sell: z.boolean().optional(),
  // Add other optional fields from GetPSBTParams if needed
});

export async function POST(request: NextRequest) {
  let params;
  try {
    params = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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
    // Ensure orders are properly typed before sending
    const psbtParams: GetPSBTParams = {
      ...validatedParams,
      orders: validatedParams.orders as unknown as RuneOrder[], // Cast through unknown first
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