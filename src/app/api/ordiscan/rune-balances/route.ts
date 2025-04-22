import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneBalance } from '@/types/ordiscan';
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequest } from '@/lib/apiUtils';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  // Zod validation for 'address'
  const schema = z.object({ address: z.string().min(1) });
  const validation = await validateRequest(request, schema, 'query');
  if (!validation.success) {
    return validation.errorResponse;
  }
  const { address } = validation.data;

  try {
    const ordiscan = getOrdiscanClient();
    const balances: RuneBalance[] = await ordiscan.address.getRunes({ address: address });
    
    // Ensure we always return a valid array
    const validBalances: RuneBalance[] = Array.isArray(balances) ? balances : [];
    
    return createSuccessResponse(validBalances);
  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to fetch Rune balances for ${address}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 