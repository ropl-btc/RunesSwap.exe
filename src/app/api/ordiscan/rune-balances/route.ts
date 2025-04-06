import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneBalance } from '@/types/ordiscan';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return createErrorResponse('Address parameter is required', undefined, 400);
  }

  try {
    const ordiscan = getOrdiscanClient();
    const balances: RuneBalance[] = await ordiscan.address.getRunes({ address });
    
    // Ensure we always return a valid array
    const validBalances: RuneBalance[] = Array.isArray(balances) ? balances : [];
    
    return createSuccessResponse(validBalances);
  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to fetch Rune balances for ${address}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 