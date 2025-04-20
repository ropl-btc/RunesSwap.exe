import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneBalance } from '@/types/ordiscan';
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
    const balances: RuneBalance[] = await ordiscan.address.getRunes({ address: validAddress });
    
    // Ensure we always return a valid array
    const validBalances: RuneBalance[] = Array.isArray(balances) ? balances : [];
    
    return createSuccessResponse(validBalances);
  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to fetch Rune balances for ${validAddress}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 