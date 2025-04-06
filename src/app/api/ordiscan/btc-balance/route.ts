import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return createErrorResponse('Address parameter is required', undefined, 400);
  }

  try {
    const ordiscan = getOrdiscanClient();
    // Use the original logic from src/lib/ordiscan.ts
    const utxos = await ordiscan.address.getUtxos({ address });

    if (!Array.isArray(utxos)) {
       console.warn(`[API Route] Invalid or empty UTXO data received for address ${address}. Expected array, got:`, utxos);
       // Return 0 balance if data is invalid
       return createSuccessResponse({ balance: 0 }); 
    }

    const totalBalance = utxos.reduce((sum, utxo) => sum + (utxo.value || 0), 0);
    return createSuccessResponse({ balance: totalBalance });

  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to fetch BTC balance for ${address}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 