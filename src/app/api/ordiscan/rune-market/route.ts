import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequest } from '@/lib/apiUtils';
import { getRuneMarketData } from '@/lib/runeMarketData';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  // const { searchParams } = new URL(request.url);
  // const name = searchParams.get('name');

  // Zod validation for 'name'
  const schema = z.object({ name: z.string().min(1) });
  const validation = await validateRequest(request, schema, 'query');
  if (!validation.success) return validation.errorResponse;
  const { name: validName } = validation.data;

  // Ensure name doesn't have spacers for the API call
  const formattedName = validName.replace(/•/g, '');

  try {
    const marketInfo = await getRuneMarketData(formattedName);
    
    if (!marketInfo) {
      console.warn(`[API Route] Rune market info not found for ${formattedName}`);
      // Return null data with success: true for consistent client-side handling
      return createSuccessResponse(null, 404);
    }
    
    return createSuccessResponse(marketInfo);
  } catch (error: unknown) {
    const errorInfo = handleApiError(error, `Failed to fetch market info for rune ${formattedName}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 