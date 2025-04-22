import { NextRequest, NextResponse } from 'next/server';
import type { GetPSBTParams } from 'satsterminal-sdk';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { z } from 'zod';
import { handleApiError, createErrorResponse, validateRequest } from '@/lib/apiUtils';
import { runeOrderSchema } from '@/types/satsTerminal';

type RuneOrder = z.infer<typeof runeOrderSchema>;

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
  const validation = await validateRequest(request, getPsbtParamsSchema, 'body');
  if (!validation.success) return validation.errorResponse;
  const validatedParams = validation.data;

  try {
    const terminal = getSatsTerminalClient();
    const psbtParams: Omit<GetPSBTParams, 'orders'> & { orders: RuneOrder[] } = {
      ...validatedParams,
      orders: validatedParams.orders,
    };

    const psbtResponse = await terminal.getPSBT(psbtParams);
    return NextResponse.json(psbtResponse);

  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to generate PSBT');
    // Special handling for quote expired
    if (errorInfo.message.includes('Quote expired') || (error && typeof error === 'object' && (error as { code?: string }).code === 'ERR677K3')) {
      return createErrorResponse('Quote expired. Please fetch a new quote.', errorInfo.details, 410);
    }
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 