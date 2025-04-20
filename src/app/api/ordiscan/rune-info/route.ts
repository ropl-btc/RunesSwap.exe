import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';
import { getRuneData } from '@/lib/runesData';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  // Zod validation for 'name'
  const schema = z.object({ name: z.string().min(1) });
  const validation = schema.safeParse({ name });
  if (!validation.success) {
    return createErrorResponse('Invalid query parameter', validation.error.message, 400);
  }
  const { name: validName } = validation.data;

  // Ensure name doesn't have spacers for the API call
  const formattedName = validName.replace(/•/g, '');

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