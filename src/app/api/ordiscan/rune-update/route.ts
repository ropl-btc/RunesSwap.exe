import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequest } from '@/lib/apiUtils';
import { z } from 'zod';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { supabase } from '@/lib/supabase';
import { RuneData } from '@/lib/runesData';

export async function POST(request: NextRequest) {
  // Zod validation for 'name'
  const schema = z.object({ name: z.string().min(1) });
  const validation = await validateRequest(request, schema, 'body');
  if (!validation.success) return validation.errorResponse;
  const { name: runeName } = validation.data;

  try {
    // Use the serverUtils client that securely contains API keys
    const ordiscan = getOrdiscanClient();
    const runeData = await ordiscan.rune.getInfo({ name: runeName });

    if (!runeData) {
      console.warn(`[API Route] Rune info not found for ${runeName}`);
      return createSuccessResponse(null, 404);
    }

    // Update in Supabase - ensure we're using the correct field names
    const dataToUpdate = {
      ...runeData,
      last_updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('runes')
      .update(dataToUpdate)
      .eq('name', runeName)
      .select();

    if (updateError) {
      console.error('[API Route] Error updating rune data:', updateError);
      console.error('[API Route] Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
    }

    return createSuccessResponse(runeData as RuneData);
  } catch (error: unknown) {
    const errorInfo = handleApiError(error, `Failed to update info for rune ${runeName}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 