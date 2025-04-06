import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneInfo } from '@/types/ordiscan';
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
    const info: RuneInfo = await ordiscan.rune.getInfo({ name: formattedName });
    
    // Validate that info is an object and not null
    if (!info || typeof info !== 'object') {
      console.warn(`[API Route] Invalid rune info received for ${formattedName}`);
      return createErrorResponse('Invalid rune info data received', undefined, 500);
    }
    
    return createSuccessResponse(info);
  } catch (error: unknown) {
    // Special handling for 404 errors
    const errorInfo = handleApiError(error, `Failed to fetch info for rune ${formattedName}`);
    
    // Return null with 404 status for "not found" errors
    if (errorInfo.status === 404) {
      console.warn(`[API Route] Rune info not found for ${formattedName}`);
      // Return null data with success: true for consistent client-side handling
      return createSuccessResponse(null, 404);
    }
    
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 