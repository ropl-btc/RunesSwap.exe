import { NextRequest } from 'next/server';
import type { QuoteParams } from 'satsterminal-sdk';
import { z } from 'zod';
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  validateRequest,
} from '@/lib/apiUtils';
import { getSatsTerminalClient } from '@/lib/serverUtils';

const quoteParamsSchema = z.object({
  btcAmount: z
    .union([z.string().min(1), z.number().positive()])
    .transform((val) => String(val)), // Require non-empty string or positive number, always transform to string
  runeName: z.string().min(1),
  address: z.string().min(1),
  sell: z.boolean().optional(),
  // Add other optional fields from QuoteParams if needed, e.g.:
  // marketplaces: z.array(z.string()).optional(),
  // rbfProtection: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, quoteParamsSchema, 'body');
  if (!validation.success) return validation.errorResponse;

  const { btcAmount, address, runeName, sell } = validation.data;

  try {
    const terminal = getSatsTerminalClient();

    // Convert to SDK-compatible format by ensuring all optional fields have defaults
    const quoteParams: QuoteParams = {
      btcAmount: String(btcAmount),
      address,
      runeName,
      sell: sell ?? false,
    };

    const quoteResponse = await terminal.fetchQuote(quoteParams);

    return createSuccessResponse(quoteResponse);
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to fetch quote');

    // Special handling for liquidity errors (maintain 404 status)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.toLowerCase().includes('liquidity')) {
      return createErrorResponse('No liquidity available', errorMessage, 404);
    }

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
