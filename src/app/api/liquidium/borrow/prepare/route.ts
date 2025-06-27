import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequest,
} from '@/lib/apiUtils';
import { createLiquidiumClient } from '@/lib/liquidiumSdk';
import { supabase } from '@/lib/supabase';
import type { StartLoanService } from '@/sdk/liquidium/services/StartLoanService';
import { safeArrayFirst } from '@/utils/typeGuards';

// Schema for request body
const prepareBodySchema = z.object({
  instant_offer_id: z.string().uuid(),
  fee_rate: z.number().positive(),
  token_amount: z
    .string()
    .min(1)
    .regex(/^\d+$/, 'Token amount must be a positive integer string'),
  borrower_payment_address: z.string().min(1),
  borrower_payment_pubkey: z.string().min(1),
  borrower_ordinal_address: z.string().min(1),
  borrower_ordinal_pubkey: z.string().min(1),
  collateral_asset_id: z.string().optional(), // Optional field for rune ID
  address: z.string().min(1), // User's address to find JWT
});

type StartLoanPrepareRequest = Parameters<
  StartLoanService['postApiV1BorrowerLoansStartPrepare']
>[0]['requestBody'];

export async function POST(request: NextRequest) {
  // Validate request body
  const validation = await validateRequest(request, prepareBodySchema, 'body');
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

    // Include required wallet field
    const sdkPayload: StartLoanPrepareRequest = {
      instant_offer_id: liquidiumPayload.instant_offer_id,
      fee_rate: liquidiumPayload.fee_rate,
      token_amount: liquidiumPayload.token_amount,
      borrower_payment_address: liquidiumPayload.borrower_payment_address,
      borrower_payment_pubkey: liquidiumPayload.borrower_payment_pubkey,
      borrower_ordinal_address: liquidiumPayload.borrower_ordinal_address,
      borrower_ordinal_pubkey: liquidiumPayload.borrower_ordinal_pubkey,
      borrower_wallet: 'xverse',
    };

    // 2. Call Liquidium API via SDK
    const client = createLiquidiumClient(userJwt);
    const response = await client.startLoan.postApiV1BorrowerLoansStartPrepare({
      requestBody: sdkPayload,
    });

    return createSuccessResponse(response);
  } catch (sdkError) {
    const message =
      sdkError instanceof Error ? sdkError.message : 'Unknown error';
    return createErrorResponse('Liquidium prepare borrow error', message, 500);
  }
}
