import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneMarketInfo } from '@/types/ordiscan';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name || name.trim() === '') {
    return createErrorResponse('Rune name parameter is required', undefined, 400);
  }

  // Ensure name doesn't have spacers for the API call
  const formattedName = name.replace(/•/g, '');

  try {
    const ordiscan = getOrdiscanClient();
    const marketInfo: RuneMarketInfo = await ordiscan.rune.getMarketInfo({ name: formattedName });
    
    // Validate that marketInfo is an object and not null
    if (!marketInfo || typeof marketInfo !== 'object') {
      console.warn(`[API Route] Invalid market info received for ${formattedName}`);
      return createErrorResponse('Invalid market info data received', undefined, 500);
    }
    
    return createSuccessResponse(marketInfo);
  } catch (error: unknown) {
    // Special handling for 404 errors
    const errorInfo = handleApiError(error, `Failed to fetch market info for rune ${formattedName}`);
    
    // Return null with 404 status for "not found" errors
    if (errorInfo.status === 404) {
      console.warn(`[API Route] Rune market info not found for ${formattedName}`);
      // Return null data with success: true for consistent client-side handling
      return createSuccessResponse(null, 404);
    }
    
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 