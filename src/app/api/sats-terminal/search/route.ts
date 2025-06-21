import { createHash } from 'crypto';
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

/**
 * Generate a stable ID based on item properties and index.
 * This ensures consistent IDs across API calls for the same search results.
 * @param item - The search response item
 * @param index - The item's position in the results array
 * @returns A stable, deterministic ID
 */
function generateStableId(item: SearchResponseItem, index: number): string {
  // Use existing ID if available
  if (item.token_id) return item.token_id;
  if (item.id) return item.id;

  // Create stable ID from item properties
  const identifier = [
    item.token || item.name || '',
    item.icon || item.imageURI || '',
    index.toString(),
  ]
    .filter(Boolean)
    .join('|');

  // Generate a short hash for readability
  const hash = createHash('md5').update(identifier).digest('hex').slice(0, 8);
  return `search_${hash}`;
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
      ? searchResponse.map((item: SearchResponseItem, index: number) => ({
          id: generateStableId(item, index),
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
