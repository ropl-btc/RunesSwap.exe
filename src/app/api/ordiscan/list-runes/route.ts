import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/lib/apiUtils';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { RuneInfo } from '@/types/ordiscan';

export async function GET() {
  try {
    const ordiscan = getOrdiscanClient();
    const runes: RuneInfo[] = await ordiscan.rune.list({ sort: 'newest' });

    // Ensure we always return a valid array
    const validRunes = Array.isArray(runes) ? runes : [];

    return createSuccessResponse(validRunes);
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to fetch runes list');
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
