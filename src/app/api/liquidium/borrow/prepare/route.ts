import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequest } from '@/lib/apiUtils';
import { supabase } from '@/lib/supabase';

// Schema for request body
const prepareBodySchema = z.object({
  instant_offer_id: z.string().uuid(),
  fee_rate: z.number().positive(),
  token_amount: z.string().min(1).regex(/^\d+$/, "Token amount must be a positive integer string"),
  borrower_payment_address: z.string().min(1),
  borrower_payment_pubkey: z.string().min(1),
  borrower_ordinal_address: z.string().min(1),
  borrower_ordinal_pubkey: z.string().min(1),
  collateral_asset_id: z.string().optional(), // Optional field for rune ID
  address: z.string().min(1), // User's address to find JWT
});

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
      return createErrorResponse('Database error retrieving authentication', tokenError.message, 500);
    }
    if (!tokenRows || tokenRows.length === 0) {
      return createErrorResponse('Liquidium authentication required', 'No JWT found for this address', 401);
    }
    const userJwt = tokenRows[0].jwt;

    // 2. Prepare request to Liquidium
    // Get API credentials
    const apiUrl = process.env.LIQUIDIUM_API_URL;
    if (!apiUrl) {
      return createErrorResponse('Server configuration error', 'Missing API URL configuration', 500);
    }

    const apiKey = process.env.LIQUIDIUM_API_KEY;
    if (!apiKey) {
      return createErrorResponse('Server configuration error', 'Missing API key configuration', 500);
    }

    const fullUrl = `${apiUrl}/api/v1/borrower/loans/start/prepare`;

    // For the prepare endpoint, we don't need to look up the rune ID
    // The instant_offer_id already contains the information about which rune is being used

    // 3. Call Liquidium API
    const liquidiumResponse = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-user-token': userJwt,
      },
      body: JSON.stringify(liquidiumPayload), // Send validated data without the extra 'address' field
    });

    const liquidiumData = await liquidiumResponse.json();

    if (!liquidiumResponse.ok) {

      return createErrorResponse(
        `Liquidium API error: ${liquidiumData?.error || liquidiumResponse.statusText}`,
        liquidiumData?.errorMessage || JSON.stringify(liquidiumData),
        liquidiumResponse.status
      );
    }

    // 4. Return successful response
    return createSuccessResponse(liquidiumData); // Forward Liquidium's response

  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to prepare borrow transaction');
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
}