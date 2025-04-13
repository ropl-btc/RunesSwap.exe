import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';
import { getRuneMarketData } from '@/lib/runeMarketData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name || name.trim() === '') {
    return createErrorResponse('Rune name parameter is required', undefined, 400);
  }

  // Ensure name doesn't have spacers for the API call
  const formattedName = name.replace(/•/g, '');

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