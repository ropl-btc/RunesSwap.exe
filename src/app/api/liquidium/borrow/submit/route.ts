import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  validateRequest,
} from '@/lib/apiUtils';
import { callLiquidiumApi } from '@/lib/liquidiumServer';
import { supabase } from '@/lib/supabase';
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

    // 2. Call Liquidium API
    const result = await callLiquidiumApi(
      '/api/v1/borrower/loans/start/submit',
      {
        method: 'POST',
        userJwt,
        body: JSON.stringify(liquidiumPayload),
      },
      'Liquidium submit borrow',
    );

    if (!result.ok) {
      return createErrorResponse(
        result.message ?? 'Error',
        result.details,
        result.status,
      );
    }

    const responseData = result.data;
    if (typeof responseData === 'string') {
      const trimmed = responseData.trim();
      if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
        if (trimmed.includes('success') || trimmed.includes('Success')) {
          return createSuccessResponse({
            loan_transaction_id: liquidiumPayload.prepare_offer_id,
            message: 'Loan successfully started',
            html_response: true,
          });
        }
        return createErrorResponse(
          'Liquidium API returned HTML instead of JSON',
          'The loan service returned an unexpected response format. Please try again later.',
          500,
        );
      }

      return createSuccessResponse({
        loan_transaction_id: liquidiumPayload.prepare_offer_id,
        message: 'Loan successfully started',
        raw_response: trimmed.slice(0, 100),
      });
    }
    return createSuccessResponse(responseData);
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
