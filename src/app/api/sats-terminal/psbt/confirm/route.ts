import { NextRequest, NextResponse } from 'next/server';
import type { ConfirmPSBTParams } from 'satsterminal-sdk';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { z } from 'zod';
import { handleApiError, createErrorResponse, validateRequest } from '@/lib/apiUtils';
import { runeOrderSchema } from '@/types/satsTerminal';

type ConfirmParams = z.infer<typeof confirmPsbtParamsSchema>;

const confirmPsbtParamsSchema = z.object({
  orders: z.array(runeOrderSchema),
  // TODO: Use a Bitcoin address validation library for full validation (e.g., bitcoinjs-lib)
  address: z.string().regex(
    /^(bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    'Invalid Bitcoin address'
  ),
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
  const validation = await validateRequest<ConfirmParams>(request, confirmPsbtParamsSchema, 'body');
  if (!validation.success) return validation.errorResponse;
  const validatedParams = validation.data;

  try {
    const terminal = getSatsTerminalClient();
    const confirmParams: Omit<ConfirmPSBTParams, 'orders'> & { orders: ConfirmParams['orders'] } = {
      ...validatedParams,
      orders: validatedParams.orders,
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