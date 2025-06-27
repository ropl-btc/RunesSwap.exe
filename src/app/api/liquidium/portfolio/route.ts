import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { createLiquidiumClient } from '@/lib/liquidiumSdk';
import { supabase } from '@/lib/supabase';
import { safeArrayFirst } from '@/utils/typeGuards';

// GET /api/liquidium/portfolio?address=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    if (!address) {
      return createErrorResponse(
        'Missing address',
        'address query param is required',
        400,
      );
    }
    // Now using regular client as we have proper RLS policies in place
    const { data: tokenRows, error: tokenError } = await supabase
      .from('liquidium_tokens')
      .select('jwt')
      .eq('wallet_address', address)
      .limit(1);
    if (tokenError) {
      console.error('[Liquidium] Supabase error:', tokenError);
      return createErrorResponse(
        'Database error retrieving authentication',
        tokenError.message,
        500,
      );
    }
    const firstToken = safeArrayFirst(tokenRows);
    if (!firstToken?.jwt) {
      console.warn('[Liquidium] No JWT found for address:', address);
      return createErrorResponse(
        'Liquidium authentication required',
        'No JWT found for this address',
        401,
      );
    }
    const userJwt = firstToken.jwt;
    const client = createLiquidiumClient(userJwt);
    const portfolio = await client.portfolio.getApiV1Portfolio();

    /*
     * For UI compatibility we return borrower rune loans array directly.
     * The full portfolio object is still included under `rawPortfolio`
     * so callers can migrate later without breaking existing code.
     */
    const loans =
      portfolio?.borrower?.runes?.loans ??
      portfolio?.lender?.runes?.loans ??
      [];

    return createSuccessResponse({
      loans,
      rawPortfolio: portfolio,
    });
  } catch (error) {
    console.error('[Liquidium] Portfolio route error:', error);
    return createErrorResponse(
      'Failed to fetch Liquidium portfolio',
      error instanceof Error ? error.message : String(error),
      500,
    );
  }
}
