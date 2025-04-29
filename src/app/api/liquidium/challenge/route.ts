import { NextRequest } from 'next/server';
import { getLiquidiumClient } from '@/lib/serverUtils';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';

// GET /api/liquidium/challenge?ordinalsAddress=...&paymentAddress=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ordinalsAddress = searchParams.get('ordinalsAddress');
    const paymentAddress = searchParams.get('paymentAddress');
    if (!ordinalsAddress || !paymentAddress) {
      return createErrorResponse('Missing addresses', 'Both ordinalsAddress and paymentAddress are required', 400);
    }
    const liquidium = getLiquidiumClient();
    // Call Liquidium API to get challenge messages
    const challenge = await liquidium.authPrepare(paymentAddress, ordinalsAddress);
    return createSuccessResponse(challenge);
  } catch (error) {
    return createErrorResponse('Failed to get Liquidium challenge', error instanceof Error ? error.message : String(error), 500);
  }
} 