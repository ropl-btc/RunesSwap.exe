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
import type { BorrowerService } from '@/sdk/liquidium/services/BorrowerService';
import { safeArrayAccess, safeArrayFirst } from '@/utils/typeGuards';

// Schema for query parameters
const rangeParamsSchema = z.object({
  runeId: z.string().min(1),
  address: z.string().min(1), // User's address to find JWT
});

export async function GET(request: NextRequest) {
  // Validate query parameters first
  const validation = await validateRequest(request, rangeParamsSchema, 'query');
  if (!validation.success) {
    return validation.errorResponse;
  }

  let { runeId } = validation.data;
  const { address } = validation.data;

  try {
    // 0. Look up the actual rune ID from our database
    if (runeId.includes(':')) {
      // Already in correct format
    } else {
      // Try to find by name first
      const { data: runeDataByName, error: runeErrorByName } = await supabase
        .from('runes')
        .select('id')
        .ilike('name', runeId)
        .limit(1);

      if (runeErrorByName) {
        console.error(
          '[API Error] Failed to fetch rune by name',
          runeErrorByName,
        );
      } else {
        const firstRuneByName = safeArrayFirst(runeDataByName);
        if (firstRuneByName?.id) {
          runeId = firstRuneByName.id;
        } else {
          // If not found by name, try to find by ID prefix
          const { data: runeDataById, error: runeErrorById } = await supabase
            .from('runes')
            .select('id')
            .ilike('id', `${runeId}:%`)
            .limit(1);

          if (runeErrorById) {
            console.error(
              '[API Error] Failed to fetch rune by ID',
              runeErrorById,
            );
          } else {
            const firstRuneById = safeArrayFirst(runeDataById);
            if (firstRuneById?.id) {
              runeId = firstRuneById.id;
            } else {
              // Special case for LIQUIDIUMTOKEN
              if (runeId.toLowerCase() === 'liquidiumtoken') {
                const { data: liquidiumData, error: liquidiumError } =
                  await supabase
                    .from('runes')
                    .select('id')
                    .eq('name', 'LIQUIDIUMTOKEN')
                    .limit(1);

                if (liquidiumError) {
                  console.error(
                    '[API Error] Failed to fetch LIQUIDIUMTOKEN',
                    liquidiumError,
                  );
                } else {
                  const firstLiquidiumData = safeArrayFirst(liquidiumData);
                  if (firstLiquidiumData?.id) {
                    runeId = firstLiquidiumData.id;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Check if we have a cached range that's less than 5 minutes old
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { data: cachedRanges, error: cachedRangesError } = await supabase
      .from('rune_borrow_ranges')
      .select('*')
      .eq('rune_id', runeId)
      .gt('updated_at', fiveMinutesAgo.toISOString())
      .limit(1);

    if (!cachedRangesError && cachedRanges && cachedRanges.length > 0) {
      return createSuccessResponse({
        runeId,
        minAmount: cachedRanges[0].min_amount,
        maxAmount: cachedRanges[0].max_amount,
        cached: true,
        updatedAt: cachedRanges[0].updated_at,
      });
    }

    // 1. Get User JWT from Supabase
    const { data: tokenRows, error: tokenError } = await supabase
      .from('liquidium_tokens')
      .select('jwt, expires_at')
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
        'No JWT found for this address. Please authenticate with Liquidium first.',
        401,
      );
    }

    const userJwt = firstToken.jwt;
    const expiresAt = firstToken.expires_at;

    // Check if JWT is expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return createErrorResponse(
        'Authentication expired',
        'Your authentication has expired. Please re-authenticate with Liquidium.',
        401,
      );
    }

    // We'll use a dummy amount of 1 to get the valid ranges
    const dummyAmount = '1';

    // Response type helpers from the Liquidium SDK (needs to be declared
    // before we receive the response so we can type the variable correctly)
    type OffersResp = Awaited<
      ReturnType<BorrowerService['getApiV1BorrowerCollateralRunesOffers']>
    >;

    /*
     * Older versions of the API returned `valid_ranges` at the top level.
     * Keep a lightweight definition so we can safely support both shapes
     * without falling back to `any`.
     */
    type LegacyRanges = {
      valid_ranges: OffersResp['runeDetails']['valid_ranges'];
    };

    type LiquidiumRangeResp = OffersResp | LegacyRanges;

    let liquidiumData: LiquidiumRangeResp;

    try {
      const client = createLiquidiumClient(userJwt);
      liquidiumData =
        await client.borrower.getApiV1BorrowerCollateralRunesOffers({
          runeId,
          runeAmount: dummyAmount,
        });
    } catch (sdkError) {
      const message =
        sdkError instanceof Error ? sdkError.message : 'Unknown error';
      return createErrorResponse('Liquidium API error', message, 500);
    }

    // We now have a typed Liquidium response, extract the valid ranges
    let validRanges: OffersResp['runeDetails']['valid_ranges'];

    if ('valid_ranges' in liquidiumData) {
      // Legacy response shape
      validRanges = (liquidiumData as LegacyRanges).valid_ranges;
    } else if ('runeDetails' in liquidiumData) {
      validRanges = (liquidiumData as OffersResp).runeDetails.valid_ranges;
    } else {
      throw new Error('valid_ranges field not found in Liquidium response');
    }

    // Helper function to process ranges and extract min/max values
    interface RangeData {
      min: string;
      max: string;
    }

    function processRanges(ranges: RangeData[]): { min: string; max: string } {
      if (!Array.isArray(ranges) || ranges.length === 0) {
        throw new Error('No valid ranges found');
      }

      const firstRange = safeArrayFirst(ranges);
      if (!firstRange?.min || !firstRange?.max) {
        throw new Error('Range data is missing required fields');
      }

      let globalMin = BigInt(firstRange.min);
      let globalMax = BigInt(firstRange.max);

      for (let i = 1; i < ranges.length; i++) {
        const currentRange = safeArrayAccess(ranges, i);
        if (!currentRange?.min || !currentRange?.max) {
          console.warn(`[API Warning] Skipping invalid range at index ${i}`);
          continue;
        }

        const currentMin = BigInt(currentRange.min);
        const currentMax = BigInt(currentRange.max);
        if (currentMin < globalMin) globalMin = currentMin;
        if (currentMax > globalMax) globalMax = currentMax;
      }

      return {
        min: globalMin.toString(),
        max: globalMax.toString(),
      };
    }

    // 5. Extract the min-max range from the response
    let minAmount = '0';
    let maxAmount = '0';
    let loanTermDays: number[] = [];

    try {
      const processedRanges = processRanges(validRanges.rune_amount.ranges);
      minAmount = processedRanges.min;
      maxAmount = processedRanges.max;

      // Store loan term days if available
      if (validRanges.loan_term_days) {
        loanTermDays = validRanges.loan_term_days;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error processing ranges';
      return createErrorResponse('Invalid range data', errorMessage, 500);
    }

    // Store the range in the database
    await supabase.from('rune_borrow_ranges').upsert(
      {
        rune_id: runeId,
        min_amount: minAmount,
        max_amount: maxAmount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'rune_id',
      },
    );

    // Return successful response
    return createSuccessResponse({
      runeId,
      minAmount,
      maxAmount,
      loanTermDays,
      cached: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to fetch borrow ranges');
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
