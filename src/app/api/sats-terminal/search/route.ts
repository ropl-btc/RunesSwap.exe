import { NextRequest } from 'next/server';
import type { SearchParams } from 'satsterminal-sdk';
import { z } from 'zod';
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  validateRequest,
} from '@/lib/apiUtils';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import type { Rune } from '@/types/satsTerminal';

const searchParamsSchema = z.object({
  query: z.string().min(1, 'Query parameter is required'),
  sell: z.string().optional(),
});

interface SearchResponseItem {
  token_id?: string;
  id?: string;
  token?: string;
  name?: string;
  icon?: string;
  imageURI?: string;
}

export async function GET(request: NextRequest) {
  const validation = await validateRequest(
    request,
    searchParamsSchema,
    'query',
  );
  if (!validation.success) return validation.errorResponse;

  const { query, sell } = validation.data;

  try {
    const terminal = getSatsTerminalClient();

    // Convert to SDK-compatible format
    const searchParams: SearchParams = {
      query: query,
      sell: sell === 'true',
    };

    const searchResponse = await terminal.search(searchParams);

    // Transform the raw SDK response to match our Rune interface
    const transformedResults: Rune[] = Array.isArray(searchResponse)
      ? searchResponse.map((item: SearchResponseItem) => ({
          id: item.token_id || item.id || `unknown_${Math.random()}`,
          name: item.token || item.name || 'Unknown',
          imageURI: item.icon || item.imageURI || '',
        }))
      : [];

    return createSuccessResponse(transformedResults);
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to search');
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Special handling for rate limiting
    if (errorMessage.includes('Rate limit') || errorInfo.status === 429) {
      return createErrorResponse(
        'Rate limit exceeded',
        'Please try again later',
        429,
      );
    }

    // Handle unexpected token errors (HTML responses instead of JSON)
    if (errorMessage.includes('Unexpected token')) {
      return createErrorResponse(
        'API service unavailable',
        'The SatsTerminal API is currently unavailable. Please try again later.',
        503,
      );
    }

    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
