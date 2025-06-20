import { NextRequest, NextResponse } from 'next/server';
import type { SearchParams } from 'satsterminal-sdk';
import { z } from 'zod';
import {
  createErrorResponse,
  handleApiError,
  validateRequest,
} from '@/lib/apiUtils';
import { getSatsTerminalClient } from '@/lib/serverUtils';

const searchParamsSchema = z.object({
  rune_name: z.string().min(1, 'Rune name is required'),
  sell: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, searchParamsSchema, 'body');
  if (!validation.success) return validation.errorResponse;

  const { rune_name, sell } = validation.data;

  try {
    const terminal = getSatsTerminalClient();

    // Convert to SDK-compatible format by ensuring all optional fields have defaults
    const searchParams: SearchParams = {
      rune_name,
      sell: sell ?? false,
    };

    const searchResponse = await terminal.search(searchParams);
    return NextResponse.json(searchResponse);
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
