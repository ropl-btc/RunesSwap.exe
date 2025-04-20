import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  // Zod validation for 'address'
  const schema = z.object({ address: z.string().min(1) });
  const validation = schema.safeParse({ address });
  if (!validation.success) {
    return createErrorResponse('Invalid query parameter', validation.error.message, 400);
  }
  const { address: validAddress } = validation.data;

  try {
    const ordiscan = getOrdiscanClient();
    // Use the original logic from src/lib/ordiscan.ts
    const utxos = await ordiscan.address.getUtxos({ address: validAddress });

    if (!Array.isArray(utxos)) {
       console.warn(`[API Route] Invalid or empty UTXO data received for address ${validAddress}. Expected array, got:`, utxos);
       // Return 0 balance if data is invalid
       return createSuccessResponse({ balance: 0 }); 
    }

    const totalBalance = utxos.reduce((sum, utxo) => sum + (utxo.value || 0), 0);
    return createSuccessResponse({ balance: totalBalance });

  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to fetch BTC balance for ${validAddress}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 