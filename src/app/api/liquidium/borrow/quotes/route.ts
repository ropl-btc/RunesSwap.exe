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
import { safeArrayFirst } from '@/utils/typeGuards';

// Schema for query parameters
const quoteParamsSchema = z.object({
  runeId: z.string().min(1),
  runeAmount: z
    .string()
    .min(1)
    .regex(/^\d+$/, 'Amount must be a positive integer string'),
  address: z.string().min(1), // User's address to find JWT
});

export async function GET(request: NextRequest) {
  // Validate query parameters first
  const validation = await validateRequest(request, quoteParamsSchema, 'query');
  if (!validation.success) {
    return validation.errorResponse;
  }

  let { runeId } = validation.data;
  const { runeAmount, address } = validation.data;

  try {
    // 0. Look up the actual rune ID from our database
    // First check if the runeId is already in the correct format (e.g., "810010:907")
    if (runeId.includes(':')) {
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

    // 2. Call Liquidium API via generated SDK
    try {
      const client = createLiquidiumClient(userJwt);
      const data = await client.borrower.getApiV1BorrowerCollateralRunesOffers({
        runeId,
        runeAmount,
      });

      return createSuccessResponse(data);
    } catch (sdkError) {
      const message =
        sdkError instanceof Error ? sdkError.message : 'Unknown error';
      return createErrorResponse('Liquidium borrow quotes error', message, 500);
    }
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to fetch borrow quotes');
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
