import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { createLiquidiumClient } from '@/lib/liquidiumSdk';
import { supabase } from '@/lib/supabase';
import { safeArrayFirst } from '@/utils/typeGuards';

// POST /api/liquidium/repay
export async function POST(request: NextRequest) {
  try {
    const { loanId, address, signedPsbt } = await request.json();
    if (!loanId || !address) {
      return createErrorResponse(
        'Missing parameters',
        'loanId and address are required',
        400,
      );
    }
    // Look up JWT for this address using regular client
    const { data: tokenRows, error: tokenError } = await supabase
      .from('liquidium_tokens')
      .select('jwt')
      .eq('wallet_address', address)
      .limit(1);
    if (tokenError) {
      return createErrorResponse(
        'Database error retrieving authentication',
        tokenError.message,
        500,
      );
    }
    const firstToken = safeArrayFirst(tokenRows);
    if (!firstToken?.jwt) {
      return createErrorResponse(
        'Liquidium authentication required',
        'No JWT found for this address',
        401,
      );
    }
    const userJwt = firstToken.jwt;
    const client = createLiquidiumClient(userJwt);

    if (signedPsbt) {
      const response = await client.repayLoan.postApiV1BorrowerLoansRepaySubmit(
        {
          requestBody: {
            offer_id: loanId,
            signed_psbt_base_64: signedPsbt,
          },
        },
      );
      return createSuccessResponse(response);
    }

    // prepare
    const feeRate = 5;
    const resp = await client.repayLoan.postApiV1BorrowerLoansRepayPrepare({
      requestBody: {
        offer_id: loanId,
        fee_rate: feeRate,
      },
    });
    return createSuccessResponse(resp);
  } catch (error) {
    return createErrorResponse(
      'Failed to process repayment',
      error instanceof Error ? error.message : String(error),
      500,
    );
  }
}
