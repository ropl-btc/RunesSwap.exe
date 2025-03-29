import { SatsTerminal, type QuoteParams, type GetPSBTParams, type ConfirmPSBTParams, type PopularCollectionsParams } from 'satsterminal-sdk';

// Get API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_SATS_TERMINAL_API_KEY;
if (!apiKey) {
  console.warn("SatsTerminal API key not found. Please set NEXT_PUBLIC_SATS_TERMINAL_API_KEY environment variable.");
}

// Initialize with the API key from environment variables
const terminal = new SatsTerminal({ apiKey: apiKey || '' });

// Define types for rune responses - Added imageURI
export interface Rune {
  id: string;
  name: string;
  imageURI?: string; // Added optional image URI
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

export const searchRunes = async (query: string): Promise<Rune[]> => {
  try {
    const searchResults = await terminal.search({ 
      rune_name: query,
      sell: false // Set to true if you want to search for sell orders
    });
    
    // Map the response to our Rune interface
    // Determine if the result is an array or an object with an 'orders' property
    const orders: SearchOrder[] = Array.isArray(searchResults) ? searchResults : 
                  (searchResults && typeof searchResults === 'object' && 'orders' in searchResults && Array.isArray(searchResults.orders)) ? 
                  (searchResults.orders as SearchOrder[]) : 
                  [];
    
    // Map safely, providing fallbacks
    return orders.map((order: SearchOrder) => ({
      id: order.id || order.rune || `unknown_rune_${Math.random()}`, // Ensure an ID exists
      name: order.etching?.runeName || order.rune || 'Unknown Rune', // Prefer etching name, fallback to rune ticker
      imageURI: order.icon_content_url_data || order.imageURI, // Prefer icon URL
      formattedAmount: order.formattedAmount,
      formattedUnitPrice: order.formattedUnitPrice,
      price: order.price
    }));
  } catch (error) {
    console.error(`Error searching for runes with query "${query}":`, error);
    throw error;
  }
};

export const fetchQuote = async (params: Omit<QuoteParams, 'btcAmount'> & { btcAmount: number | string }) => {
  try {
    // Ensure btcAmount is passed as a string to the SDK
    const quote = await terminal.fetchQuote({
      ...params,
      btcAmount: String(params.btcAmount), // Convert to string
    });
    return quote;
  } catch (error) {
    console.error("Error fetching quote:", error);
    throw error;
  }
};

export const getPSBT = async (params: GetPSBTParams) => {
  try {
    const psbtData = await terminal.getPSBT(params);
    return psbtData;
  } catch (error) {
    console.error("Error getting PSBT:", error);
    throw error;
  }
}

export const confirmPSBT = async (params: ConfirmPSBTParams) => {
  try {
    const confirmation = await terminal.confirmPSBT(params);
    return confirmation;
  } catch (error) {
    console.error("Error confirming PSBT:", error);
    throw error;
  }
}

// Export popularCollections
export const popularCollections = async (params: PopularCollectionsParams) => {
  try {
    const collections = await terminal.popularCollections(params);
    return collections;
  } catch (error) {
    console.error("Error fetching popular collections:", error);
    throw error;
  }
};

// Additional SDK functions can be added here as needed 