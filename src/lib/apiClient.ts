import {
    type RuneBalance as OrdiscanRuneBalance,
    type RuneInfo as OrdiscanRuneInfo,
    type RuneMarketInfo as OrdiscanRuneMarketInfo,
    type RuneActivityEvent,
} from '@/types/ordiscan';
import type { Rune } from '@/types/satsTerminal';
import { type QuoteResponse, type GetPSBTParams, type ConfirmPSBTParams } from 'satsterminal-sdk';
import { type RuneData } from './runesData';

// API Query Keys for React Query caching
export const QUERY_KEYS = {
  POPULAR_RUNES: 'popularRunes',
  RUNE_INFO: 'runeInfo',
  RUNE_MARKET: 'runeMarket',
  RUNE_PRICE_HISTORY: 'runePriceHistory',
  BTC_BALANCE: 'btcBalance',
  RUNE_BALANCES: 'runeBalances',
  RUNE_LIST: 'runesList',
  RUNE_ACTIVITY: 'runeActivity',
  PORTFOLIO_DATA: 'portfolioData'
};

// Standard API response handler
const handleApiResponse = <T>(data: unknown, expectedArrayType = false): T => {
  // Handle the standardized response format
  if (data && typeof data === 'object' && 'success' in data && (data as Record<string, unknown>).success === true && 'data' in data) {
    // Return the data property
    const responseData = (data as { data: unknown }).data;
    if (expectedArrayType && !Array.isArray(responseData)) {
      console.error("[Client] API response data is not an array:", responseData);
      return ([] as unknown) as T; // Return empty array
    }
    return responseData as T;
  }
  
  // Fallback for direct array/object response (backward compatibility)
  if ((expectedArrayType && Array.isArray(data)) || (!expectedArrayType && data !== null)) {
    return data as T;
  }
  
  console.error("[Client] API response was OK, but data format is unexpected:", data);
  return (expectedArrayType ? [] : null) as unknown as T;
};

// Fetch Runes search results from API
export const fetchRunesFromApi = async (query: string): Promise<Rune[]> => {
  if (!query) return [];
  
  const response = await fetch(`/api/sats-terminal/search?query=${encodeURIComponent(query)}`);
  let data;
  try {
      data = await response.json();
  } catch (error) {
      console.error(`[Client] Failed to parse API response as JSON for ${query}:`, error);
      throw new Error('Failed to parse search results');
  }

  if (!response.ok) {
      console.error('[Client] API returned error:', data);
      throw new Error(data?.error?.message || data?.error || `Search failed: ${response.statusText}`);
  }

  return handleApiResponse<Rune[]>(data, true);
};

// Fetch Popular Collections from API (cached version)
export const fetchPopularFromApi = async (): Promise<Record<string, unknown>[]> => {
  const response = await fetch('/api/cached-popular-runes');
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error('Failed to parse popular collections');
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to fetch popular collections: ${response.statusText}`);
  }
  return handleApiResponse<Record<string, unknown>[]>(data, true);
};

// Direct access to SatsTerminal popular collections (if needed)
export const fetchSatsTerminalPopularFromApi = async (): Promise<Record<string, unknown>[]> => {
  const response = await fetch('/api/sats-terminal/popular');
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error('Failed to parse popular collections');
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to fetch popular collections: ${response.statusText}`);
  }
  return handleApiResponse<Record<string, unknown>[]>(data, true);
};

// Fetch Quote from API
export const fetchQuoteFromApi = async (params: Record<string, unknown>): Promise<QuoteResponse> => {
  const response = await fetch('/api/sats-terminal/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
  });
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error('Failed to parse quote response');
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to fetch quote: ${response.statusText}`);
  }
  return handleApiResponse<QuoteResponse>(data, false);
};

// Get PSBT from API
export const getPsbtFromApi = async (params: GetPSBTParams): Promise<Record<string, unknown>> => {
  const response = await fetch('/api/sats-terminal/psbt/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
  });
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error('Failed to parse PSBT response');
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to create PSBT: ${response.statusText}`);
  }
  return handleApiResponse<Record<string, unknown>>(data, false);
};

// Confirm PSBT via API
export const confirmPsbtViaApi = async (params: ConfirmPSBTParams): Promise<Record<string, unknown>> => {
  const response = await fetch('/api/sats-terminal/psbt/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
  });
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error('Failed to parse confirmation response');
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to confirm PSBT: ${response.statusText}`);
  }
  return handleApiResponse<Record<string, unknown>>(data, false);
};

// Fetch BTC Balance from API
export const fetchBtcBalanceFromApi = async (address: string): Promise<number> => {
  const response = await fetch(`/api/ordiscan/btc-balance?address=${encodeURIComponent(address)}`);
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error(`Failed to parse BTC balance for ${address}`);
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to fetch BTC balance: ${response.statusText}`);
  }
  const parsedData = handleApiResponse<{ balance: number }>(data, false);
  return parsedData?.balance || 0;
};

// Fetch Rune Balances from API
export const fetchRuneBalancesFromApi = async (address: string): Promise<OrdiscanRuneBalance[]> => {
  const response = await fetch(`/api/ordiscan/rune-balances?address=${encodeURIComponent(address)}`);
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error(`Failed to parse rune balances for ${address}`);
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to fetch rune balances: ${response.statusText}`);
  }
  return handleApiResponse<OrdiscanRuneBalance[]>(data, true);
};

// Fetch Rune Info from API
export const fetchRuneInfoFromApi = async (name: string): Promise<RuneData | null> => {
  const normalizedName = name.replace(/•/g, '')
  const response = await fetch(`/api/ordiscan/rune-info?name=${encodeURIComponent(normalizedName)}`);
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error(`Failed to parse rune info for ${name}`);
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to fetch rune info: ${response.statusText}`);
  }
  // Handle 404 (null) responses
  if (response.status === 404) {
      return null;
  }
  return handleApiResponse<RuneData | null>(data, false);
};

// Fetch Rune Market Info from API
export const fetchRuneMarketFromApi = async (name: string): Promise<OrdiscanRuneMarketInfo | null> => {
  const normalizedName = name.replace(/•/g, '')
  const response = await fetch(`/api/ordiscan/rune-market?name=${encodeURIComponent(normalizedName)}`);
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error(`Failed to parse market info for ${name}`);
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to fetch market info: ${response.statusText}`);
  }
  // Handle 404 (null) responses
  if (response.status === 404) {
      return null;
  }
  return handleApiResponse<OrdiscanRuneMarketInfo | null>(data, false);
};

// Fetch List Runes from API
export const fetchListRunesFromApi = async (): Promise<OrdiscanRuneInfo[]> => {
  const response = await fetch('/api/ordiscan/list-runes');
  let data;
  try {
      data = await response.json();
  } catch {
      throw new Error('Failed to parse runes list');
  }
  if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || `Failed to fetch runes list: ${response.statusText}`);
  }
  return handleApiResponse<OrdiscanRuneInfo[]>(data, true);
};

// Fetch Rune Activity from API
export const fetchRuneActivityFromApi = async (address: string): Promise<RuneActivityEvent[]> => {
  const response = await fetch(`/api/ordiscan/rune-activity?address=${encodeURIComponent(address)}`);
  let data;
  try {
      data = await response.json();
  } catch (error) {
      console.error("[Client] Failed to parse API response as JSON:", error);
      if (!response.ok) {
         throw new Error(`Failed to fetch rune activity: Server responded with status ${response.status}`);
      }
      throw new Error("Failed to parse successful API response.");
  }

  if (!response.ok) {
      console.error("[Client] API returned error:", data);
      throw new Error(data?.error?.message || data?.error || `Failed to fetch rune activity: ${response.statusText}`);
  }

  return handleApiResponse<RuneActivityEvent[]>(data, true);
};

// Interface for Price History response
export interface PriceHistoryDataPoint {
  timestamp: number; // Unix timestamp in milliseconds
  price: number;     // Price in USD
}

export interface PriceHistoryResponse {
  slug: string;
  prices: PriceHistoryDataPoint[];
  available: boolean;
}

// Fetch Rune Price History from API
export const fetchRunePriceHistoryFromApi = async (runeName: string): Promise<PriceHistoryResponse> => {
  // Don't send empty requests
  if (!runeName || runeName.trim() === '') {
    return {
      slug: '',
      prices: [],
      available: false
    };
  }

  // Apply direct formatting to specific runes
  let querySlug = runeName;
  
  // Special case for LIQUIDIUM•TOKEN
  if (runeName.includes('LIQUIDIUM')) {
    querySlug = 'LIQUIDIUMTOKEN';
  }

  const response = await fetch(`/api/rune-price-history?slug=${encodeURIComponent(querySlug)}`);
  let data;
  
  try {
    data = await response.json();
  } catch (error) {
    console.error(`[Client] Failed to parse price history for ${runeName}:`, error);
    throw new Error(`Failed to parse price history for ${runeName}`);
  }

  if (!response.ok) {
    console.error('[Client] API returned error:', data);
    throw new Error(data?.error?.message || data?.error || `Failed to fetch price history: ${response.statusText}`);
  }

  return handleApiResponse<PriceHistoryResponse>(data, false);
};

// Fetch Portfolio Data from API (optimized batch request)
export const fetchPortfolioDataFromApi = async (address: string): Promise<{
  balances: OrdiscanRuneBalance[];
  runeInfos: Record<string, RuneData>;
  marketData: Record<string, OrdiscanRuneMarketInfo>;
}> => {
  if (!address) {
    return { balances: [], runeInfos: {}, marketData: {} };
  }
  
  const response = await fetch(`/api/portfolio-data?address=${encodeURIComponent(address)}`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to parse portfolio data for ${address}`);
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `Failed to fetch portfolio data: ${response.statusText}`);
  }
  return handleApiResponse<{
    balances: OrdiscanRuneBalance[];
    runeInfos: Record<string, RuneData>;
    marketData: Record<string, OrdiscanRuneMarketInfo>;
  }>(data, false);
}; 