import { NextRequest, NextResponse } from 'next/server';
import { SatsTerminal } from 'satsterminal-sdk';

// Define types for rune responses locally or import if shared
interface Rune {
  id: string;
  name: string;
  imageURI?: string;
  formattedAmount?: string;
  formattedUnitPrice?: string;
  price?: number;
}

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
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  // --- Server-side Initialization ---
  const apiKey = process.env.SATS_TERMINAL_API_KEY; // Use the server-side private key

  if (!apiKey) {
    console.error("SatsTerminal API key not found on server. Please set SATS_TERMINAL_API_KEY environment variable.");
    return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
  }

  const terminal = new SatsTerminal({ apiKey });
  // --- End Server-side Initialization ---

  try {
    const searchResults = await terminal.search({
      rune_name: query,
      sell: false // Or get from query params if needed
    });

    // Map the response (same mapping logic as before)
    const orders: SearchOrder[] = Array.isArray(searchResults) ? searchResults :
                  (searchResults && typeof searchResults === 'object' && 'orders' in searchResults && Array.isArray(searchResults.orders)) ?
                  (searchResults.orders as SearchOrder[]) :
                  [];

    const runes: Rune[] = orders.map((order: SearchOrder) => ({
      id: order.id || order.rune || `unknown_rune_${Math.random()}`,
      name: order.etching?.runeName || order.rune || 'Unknown Rune',
      imageURI: order.icon_content_url_data || order.imageURI,
      formattedAmount: order.formattedAmount,
      formattedUnitPrice: order.formattedUnitPrice,
      price: order.price
    }));

    return NextResponse.json(runes);

  } catch (error) {
    console.error(`Error searching for runes with query "${query}" on server:`, error);
    // Check if error is an object and has a message property
    const message = (error instanceof Error) ? error.message : 'Failed to search for runes';
    // Avoid leaking sensitive error details to the client
    return NextResponse.json({ error: 'Failed to search for runes', details: message }, { status: 500 });
  }
} 