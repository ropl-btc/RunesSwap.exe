import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  validateRequest,
} from '@/lib/apiUtils';
import { createLiquidiumClient } from '@/lib/liquidiumSdk';
import { supabase } from '@/lib/supabase';
import type { StartLoanService } from '@/sdk/liquidium/services/StartLoanService';
import { safeArrayFirst } from '@/utils/typeGuards';

// Schema for request body
const submitBodySchema = z.object({
  signed_psbt_base_64: z.string().min(1),
  prepare_offer_id: z.string().uuid(),
  address: z.string().min(1), // User's address to find JWT
});

export async function POST(request: NextRequest) {
  // Validate request body
  const validation = await validateRequest(request, submitBodySchema, 'body');
  if (!validation.success) {
    return validation.errorResponse;
  }
  // Exclude 'address' from the data sent to Liquidium
  const { address, ...liquidiumPayload } = validation.data;

  try {
    // 1. Get User JWT from Supabase
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

    // 2. Call Liquidium API via SDK
    try {
      const client = createLiquidiumClient(userJwt);

      type SubmitRequest = Parameters<
        StartLoanService['postApiV1BorrowerLoansStartSubmit']
      >[0]['requestBody'];

      const sdkPayload: SubmitRequest = {
        signed_psbt_base_64: liquidiumPayload.signed_psbt_base_64,
        prepare_offer_id: liquidiumPayload.prepare_offer_id,
      };

      const response = await client.startLoan.postApiV1BorrowerLoansStartSubmit(
        {
          requestBody: sdkPayload,
        },
      );

      return createSuccessResponse(response);
    } catch (error) {
      const errorInfo = handleApiError(
        error,
        'Failed to submit borrow transaction',
      );
      return createErrorResponse(
        errorInfo.message,
        errorInfo.details,
        errorInfo.status,
      );
    }
  } catch (error) {
    const errorInfo = handleApiError(
      error,
      'Failed to submit borrow transaction',
    );
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
