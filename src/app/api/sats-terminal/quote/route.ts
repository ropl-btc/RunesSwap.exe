import { NextRequest } from 'next/server';
import type { QuoteParams } from 'satsterminal-sdk';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequest } from '@/lib/apiUtils';

const quoteParamsSchema = z.object({
  btcAmount: z.union([z.string().min(1), z.number().positive()]).transform(val => String(val)), // Require non-empty string or positive number, always transform to string
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
  const validatedParams = validation.data;
  // Ensure btcAmount is a string for the SDK
  validatedParams.btcAmount = String(validatedParams.btcAmount);

  try {
    const terminal = getSatsTerminalClient();
    // Ensure btcAmount is a string for the SDK
    const quoteParams: QuoteParams = {
      ...validatedParams,
      btcAmount: validatedParams.btcAmount,
    };

    const quoteResponse = await terminal.fetchQuote(quoteParams);
    
    // Validate the response
    if (!quoteResponse || typeof quoteResponse !== 'object') {
      return createErrorResponse('Invalid quote response', 'Quote data is malformed', 500);
    }
    
    return createSuccessResponse(quoteResponse);
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to fetch quote');
    
    // Special handling for liquidity errors (maintain 404 status)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.toLowerCase().includes('liquidity')) {
      return createErrorResponse('No liquidity available', errorMessage, 404);
    }
    
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 