import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';
import { getRuneData } from '@/lib/runesData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name || name.trim() === '') {
    return createErrorResponse('Rune name parameter is required', undefined, 400);
  }

  // Ensure name doesn't have spacers for the API call
  const formattedName = name.replace(/•/g, '');

  try {
    const runeInfo = await getRuneData(formattedName);
    
    if (!runeInfo) {
      console.warn(`[API Route] Rune info not found for ${formattedName}`);
      // Return null data with success: true for consistent client-side handling
      return createSuccessResponse(null, 404);
    }
    
    return createSuccessResponse(runeInfo);
  } catch (error: unknown) {
    const errorInfo = handleApiError(error, `Failed to fetch info for rune ${formattedName}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 