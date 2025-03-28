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

export const searchRunes = async (query: string) => {
  console.log(`Searching for runes with query: "${query}"`);
  try {
    const searchResults = await terminal.search({ 
      rune_name: query,
      sell: false // Set to true if you want to search for sell orders
    });
    
    console.log("Search results raw:", JSON.stringify(searchResults, null, 2)); // Log raw search results
    
    // Map the response to our Rune interface
    // Adjusted mapping for name and image based on likely structure
    // The structure of searchResults depends on the SatsTerminal API response
    const orders: any[] = Array.isArray(searchResults) ? searchResults : 
                  searchResults && typeof searchResults === 'object' && 'orders' in searchResults ? 
                  (searchResults.orders as any[]) : 
                  [];
    
    return orders.map((order: any) => ({
      id: order.id || order.rune, // Use rune ticker/id as unique key
      name: order.etching?.runeName || order.rune, // Use formatted name, fallback to ticker
      imageURI: order.icon_content_url_data || order.imageURI, // Use icon URL, fallback to imageURI
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
  console.log("Fetching quote...", params);
  try {
    // Ensure btcAmount is passed as a string to the SDK
    const quote = await terminal.fetchQuote({
      ...params,
      btcAmount: String(params.btcAmount), // Convert to string
    });
    console.log("Quote received:", quote);
    return quote;
  } catch (error) {
    console.error("Error fetching quote:", error);
    throw error;
  }
};

export const getPSBT = async (params: GetPSBTParams) => {
  console.log("Getting PSBT...", params);
  try {
    const psbtData = await terminal.getPSBT(params);
    console.log("PSBT data:", psbtData);
    return psbtData;
  } catch (error) {
    console.error("Error getting PSBT:", error);
    throw error;
  }
}

export const confirmPSBT = async (params: ConfirmPSBTParams) => {
  console.log("Confirming PSBT...", params);
  try {
    const confirmation = await terminal.confirmPSBT(params);
    console.log("Confirmation result:", confirmation);
    return confirmation;
  } catch (error) {
    console.error("Error confirming PSBT:", error);
    throw error;
  }
}

// Export popularCollections
export const popularCollections = async (params: PopularCollectionsParams) => {
  console.log("Fetching popular collections...");
  try {
    const collections = await terminal.popularCollections(params);
    console.log("Popular collections received:", collections);
    return collections;
  } catch (error) {
    console.error("Error fetching popular collections:", error);
    throw error;
  }
};

// Additional SDK functions can be added here as needed 