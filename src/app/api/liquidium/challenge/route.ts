import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { createLiquidiumClient } from '@/lib/liquidiumSdk';

// GET /api/liquidium/challenge?ordinalsAddress=...&paymentAddress=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ordinalsAddress = searchParams.get('ordinalsAddress');
    const paymentAddress = searchParams.get('paymentAddress');
    if (!ordinalsAddress || !paymentAddress) {
      return createErrorResponse(
        'Missing addresses',
        'Both ordinalsAddress and paymentAddress are required',
        400,
      );
    }
    const client = createLiquidiumClient();
    const challenge = await client.authentication.postApiV1AuthPrepare({
      requestBody: {
        payment_address: paymentAddress,
        ordinals_address: ordinalsAddress,
        wallet: 'xverse', // default wallet field; adjust if needed
      },
    });
    return createSuccessResponse(challenge);
  } catch (error) {
    return createErrorResponse(
      'Failed to get Liquidium challenge',
      error instanceof Error ? error.message : String(error),
      500,
    );
  }
}
