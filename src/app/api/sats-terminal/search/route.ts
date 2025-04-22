import { NextRequest } from 'next/server';
import { getSatsTerminalClient } from '@/lib/serverUtils';
import type { Rune } from '@/types/satsTerminal';
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequest } from '@/lib/apiUtils';
import { z } from 'zod';

// Define types for rune responses locally or import if shared
// interface Rune {
//   id: string;
//   name: string;
//   imageURI?: string;
//   formattedAmount?: string;
//   formattedUnitPrice?: string;
//   price?: number;
// }

// Simple internal type for expected order structure from search
interface SearchOrder {
  id?: string;
  rune?: string;
  etching?: { runeName?: string };
  icon_content_url_data?: string;
  imageURI?: string;
  formattedAmount?: string;
  formattedUnitPrice?: string;
  price?: number;
}

export async function GET(request: NextRequest) {
  // const { searchParams } = new URL(request.url);
  // const query = searchParams.get('query');

  // Zod validation for 'query'
  const schema = z.object({ query: z.string().min(1) });
  const validation = await validateRequest(request, schema, 'query');
  if (!validation.success) return validation.errorResponse;
  const { query: validQuery } = validation.data;

  try {
    const terminal = getSatsTerminalClient();
    const searchResults = await terminal.search({
      rune_name: validQuery,
      sell: false // Or get from query params if needed
    });

    // Map the response with improved type checking
    const orders: SearchOrder[] = Array.isArray(searchResults) ? searchResults :
                  (searchResults && typeof searchResults === 'object' && 'orders' in searchResults && Array.isArray(searchResults.orders)) ?
                  (searchResults.orders as SearchOrder[]) :
                  [];

    // Generate a stable ID using a hash of properties instead of random
    const generateStableId = (order: SearchOrder, index: number): string => {
      const base = order.id || order.rune || order.etching?.runeName;
      if (base) return base;
      // Fallback to a stable ID based on properties and index
      return `unknown_rune_${index}_${order.formattedAmount || ''}_${order.price || 0}`;
    };

    const runes: Rune[] = orders.map((order: SearchOrder, index: number) => ({
      id: generateStableId(order, index),
      name: order.etching?.runeName || order.rune || 'Unknown Rune',
      imageURI: order.icon_content_url_data || order.imageURI,
      formattedAmount: order.formattedAmount,
      formattedUnitPrice: order.formattedUnitPrice,
      price: order.price
    }));

    return createSuccessResponse(runes);
  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to search for runes with query "${validQuery}"`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 