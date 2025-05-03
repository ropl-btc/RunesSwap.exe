import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequest } from '@/lib/apiUtils';
import { supabase } from '@/lib/supabase';

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
    // Look up the actual rune ID from our database if not already in the correct format
    if (!runeId.includes(':')) {
      // Try to find by name first
      const { data: runeDataByName, error: runeErrorByName } = await supabase
        .from('runes')
        .select('id')
        .ilike('name', runeId)
        .limit(1);

      if (!runeErrorByName && runeDataByName && runeDataByName.length > 0) {
        runeId = runeDataByName[0].id;
      } else {
        // If not found by name, try to find by ID prefix
        const { data: runeDataById, error: runeErrorById } = await supabase
          .from('runes')
          .select('id')
          .ilike('id', `${runeId}:%`)
          .limit(1);

        if (!runeErrorById && runeDataById && runeDataById.length > 0) {
          runeId = runeDataById[0].id;
        } else {
          // Special case for LIQUIDIUMTOKEN
          if (runeId.toLowerCase() === 'liquidiumtoken') {
            const { data: liquidiumData, error: liquidiumError } = await supabase
              .from('runes')
              .select('id')
              .eq('name', 'LIQUIDIUMTOKEN')
              .limit(1);

            if (!liquidiumError && liquidiumData && liquidiumData.length > 0) {
              runeId = liquidiumData[0].id;
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
        updatedAt: cachedRanges[0].updated_at
      });
    }

    // Get User JWT from Supabase
    const { data: tokenRows, error: tokenError } = await supabase
      .from('liquidium_tokens')
      .select('jwt, expires_at')
      .eq('wallet_address', address)
      .limit(1);

    if (tokenError) {
      return createErrorResponse('Database error retrieving authentication', tokenError.message, 500);
    }

    if (!tokenRows || tokenRows.length === 0) {
      return createErrorResponse('Liquidium authentication required', 'No JWT found for this address. Please authenticate with Liquidium first.', 401);
    }

    const userJwt = tokenRows[0].jwt;
    const expiresAt = tokenRows[0].expires_at;

    // Check if JWT is expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return createErrorResponse('Authentication expired', 'Your authentication has expired. Please re-authenticate with Liquidium.', 401);
    }

    // Prepare request to Liquidium
    // Get API credentials
    const apiUrl = process.env.LIQUIDIUM_API_URL;
    if (!apiUrl) {
      return createErrorResponse('Server configuration error', 'Missing API URL configuration', 500);
    }

    const apiKey = process.env.LIQUIDIUM_API_KEY;
    if (!apiKey) {
      return createErrorResponse('Server configuration error', 'Missing API key configuration', 500);
    }

    // We'll use a dummy amount of 1 to get the valid ranges
    const dummyAmount = "1";

    // Construct the correct URL according to the OpenAPI spec
    const fullUrl = `${apiUrl}/api/v1/borrower/collateral/runes/${encodeURIComponent(runeId)}/offers?rune_amount=${dummyAmount}`;

    // Call Liquidium API
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-user-token': userJwt, // Include user JWT
    };

    const liquidiumResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: headers,
    });

    const liquidiumData = await liquidiumResponse.json();

    if (!liquidiumResponse.ok) {
      // Try to provide a more helpful error message
      let errorMessage = liquidiumData?.errorMessage || JSON.stringify(liquidiumData);
      const errorCode = liquidiumData?.error || liquidiumResponse.statusText;

      if (errorCode === 'NOT_FOUND' && errorMessage.includes('Rune not found')) {
        errorMessage = `Rune ID "${runeId}" not found or not supported by Liquidium. Please check if this rune is supported for borrowing.`;
      }

      return createErrorResponse(
        `Liquidium API error: ${errorCode}`,
        errorMessage,
        liquidiumResponse.status
      );
    }

    // 5. Extract the min-max range from the response
    let minAmount = "0";
    let maxAmount = "0";
    let loanTermDays: number[] = [];

    // Function to find the global min and max across all ranges
    const findGlobalMinMax = (ranges: { min: string; max: string }[]) => {
      if (!ranges || ranges.length === 0) return { min: "0", max: "0" };

      // Initialize with the first range
      let globalMin = BigInt(ranges[0].min);
      let globalMax = BigInt(ranges[0].max);

      // Compare with other ranges to find global min and max
      for (let i = 1; i < ranges.length; i++) {
        const currentMin = BigInt(ranges[i].min);
        const currentMax = BigInt(ranges[i].max);

        if (currentMin < globalMin) globalMin = currentMin;
        if (currentMax > globalMax) globalMax = currentMax;
      }

      return { min: globalMin.toString(), max: globalMax.toString() };
    };

    if (liquidiumData?.valid_ranges?.rune_amount?.ranges?.length > 0) {
      const ranges = liquidiumData.valid_ranges.rune_amount.ranges;

      // Get global min and max across all ranges
      const { min, max } = findGlobalMinMax(ranges);
      minAmount = min;
      maxAmount = max;

      // Store loan term days if available
      if (liquidiumData.valid_ranges.loan_term_days) {
        loanTermDays = liquidiumData.valid_ranges.loan_term_days;
      }
    } else if (liquidiumData?.runeDetails?.valid_ranges?.rune_amount?.ranges?.length > 0) {
      // Alternative path in the response
      const ranges = liquidiumData.runeDetails.valid_ranges.rune_amount.ranges;

      // Get global min and max across all ranges
      const { min, max } = findGlobalMinMax(ranges);
      minAmount = min;
      maxAmount = max;

      // Store loan term days if available
      if (liquidiumData.runeDetails.valid_ranges.loan_term_days) {
        loanTermDays = liquidiumData.runeDetails.valid_ranges.loan_term_days;
      }
    } else {
      return createErrorResponse(
        'No valid ranges found',
        'Could not find valid borrow ranges for this rune',
        404
      );
    }

    // Store the range in the database
    await supabase
      .from('rune_borrow_ranges')
      .upsert({
        rune_id: runeId,
        min_amount: minAmount,
        max_amount: maxAmount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'rune_id'
      });

    // Return successful response
    return createSuccessResponse({
      runeId,
      minAmount,
      maxAmount,
      loanTermDays,
      cached: false,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to fetch borrow ranges');
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
}
