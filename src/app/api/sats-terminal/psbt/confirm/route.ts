import { NextRequest, NextResponse } from 'next/server';
import type { ConfirmPSBTParams } from 'satsterminal-sdk';
import { z } from 'zod';
import {
  createErrorResponse,
  handleApiError,
  validateRequest,
} from '@/lib/apiUtils';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { runeOrderSchema } from '@/types/satsTerminal';

const confirmPsbtParamsSchema = z
  .object({
    orders: z.array(runeOrderSchema),
    address: z.string().min(1, 'Bitcoin address is required'),
    publicKey: z.string().min(1, 'Public key is required'),
    paymentAddress: z.string().min(1, 'Payment address is required'),
    paymentPublicKey: z.string().min(1, 'Payment public key is required'),
    signedPsbtBase64: z.string().min(1, 'Signed PSBT is required'),
    swapId: z.string().min(1, 'Swap ID is required'),
    runeName: z.string().min(1, 'Rune name is required'),
    sell: z.boolean().optional(),
    signedRbfPsbtBase64: z.string().optional(),
    rbfProtection: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If rbfProtection is enabled, signedRbfPsbtBase64 must be provided.
      if (data.rbfProtection) {
        return !!data.signedRbfPsbtBase64;
      }
      return true;
    },
    {
      message: 'signedRbfPsbtBase64 is required when rbfProtection is enabled.',
      path: ['signedRbfPsbtBase64'],
    },
  );

export async function POST(request: NextRequest) {
  const validation = await validateRequest(
    request,
    confirmPsbtParamsSchema,
    'body',
  );
  if (!validation.success) return validation.errorResponse;
  const validatedParams = validation.data;

  try {
    const terminal = getSatsTerminalClient();

    // Convert to SDK-compatible format by ensuring all optional fields have defaults
    const confirmParams: ConfirmPSBTParams = {
      orders: validatedParams.orders.map((order) => ({
        ...order,
        fromTokenAmount: order.fromTokenAmount ?? '',
        slippage: order.slippage ?? 0,
        quantity: order.quantity ?? 0,
        maker: order.maker ?? '',
        side: order.side ?? ('BUY' as const),
        txid: order.txid ?? '',
        vout: order.vout ?? 0,
        runeName: order.runeName ?? '',
        runeAmount: order.runeAmount ?? 0,
        btcAmount: order.btcAmount ?? 0,
        satPrice: order.satPrice ?? 0,
        status: order.status ?? '',
        timestamp: order.timestamp ?? Date.now(),
      })),
      address: validatedParams.address,
      publicKey: validatedParams.publicKey,
      paymentAddress: validatedParams.paymentAddress,
      paymentPublicKey: validatedParams.paymentPublicKey,
      signedPsbtBase64: validatedParams.signedPsbtBase64,
      swapId: validatedParams.swapId,
      runeName: validatedParams.runeName,
      sell: validatedParams.sell ?? false,
      rbfProtection: validatedParams.rbfProtection ?? false,
      // Only include signedRbfPsbtBase64 if it has a valid value
      ...(validatedParams.signedRbfPsbtBase64 && {
        signedRbfPsbtBase64: validatedParams.signedRbfPsbtBase64,
      }),
    };

    const confirmResponse = await terminal.confirmPSBT(confirmParams);
    return NextResponse.json(confirmResponse);
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to confirm PSBT');
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Special handling for quote expired
    if (
      errorInfo.message.includes('Quote expired') ||
      (error &&
        typeof error === 'object' &&
        (error as { code?: string }).code === 'ERR677K3')
    ) {
      return createErrorResponse(
        'Quote expired. Please fetch a new quote.',
        errorInfo.details,
        410,
      );
    }

    // Special handling for rate limiting
    if (errorMessage.includes('Rate limit') || errorInfo.status === 429) {
      return createErrorResponse(
        'Rate limit exceeded',
        'Please try again later',
        429,
      );
    }

    // Handle unexpected token errors (HTML responses instead of JSON)
    if (errorMessage.includes('Unexpected token')) {
      return createErrorResponse(
        'API service unavailable',
        'The SatsTerminal API is currently unavailable. Please try again later.',
        503,
      );
    }

    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
