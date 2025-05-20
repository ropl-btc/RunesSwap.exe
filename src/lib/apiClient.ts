import {
  type RuneBalance as OrdiscanRuneBalance,
  type RuneInfo as OrdiscanRuneInfo,
  type RuneMarketInfo as OrdiscanRuneMarketInfo,
  type RuneActivityEvent,
} from "@/types/ordiscan";
import type { Rune } from "@/types/satsTerminal";
import {
  type QuoteResponse,
  type GetPSBTParams,
  type ConfirmPSBTParams,
} from "satsterminal-sdk";
import { type RuneData } from "./runesData";
import { normalizeRuneName } from "@/utils/runeUtils";

// API Query Keys for React Query caching
export const QUERY_KEYS = {
  POPULAR_RUNES: "popularRunes",
  RUNE_INFO: "runeInfo",
  RUNE_MARKET: "runeMarket",
  RUNE_PRICE_HISTORY: "runePriceHistory",
  BTC_BALANCE: "btcBalance",
  RUNE_BALANCES: "runeBalances",
  RUNE_LIST: "runesList",
  RUNE_ACTIVITY: "runeActivity",
  PORTFOLIO_DATA: "portfolioData",
  LIQUIDIUM_PORTFOLIO: "liquidiumPortfolio",
} as const;

export type QueryKey = (typeof QUERY_KEYS)[keyof typeof QUERY_KEYS];

// Standard API response handler
const handleApiResponse = <T>(data: unknown, expectedArrayType = false): T => {
  // Handle the standardized response format
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    (data as Record<string, unknown>).success === true &&
    "data" in data
  ) {
    // Return the data property
    const responseData = (data as { data: unknown }).data;
    if (expectedArrayType && !Array.isArray(responseData)) {
      return [] as unknown as T; // Return empty array
    }
    return responseData as T;
  }

  // Fallback for direct array/object response (backward compatibility)
  if (
    (expectedArrayType && Array.isArray(data)) ||
    (!expectedArrayType && data !== null)
  ) {
    return data as T;
  }

  return (expectedArrayType ? [] : null) as unknown as T;
};

// Fetch Runes search results from API
export const fetchRunesFromApi = async (query: string): Promise<Rune[]> => {
  if (!query) return [];

  const response = await fetch(
    `/api/sats-terminal/search?query=${encodeURIComponent(query)}`,
  );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse search results");
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Search failed: ${response.statusText}`,
    );
  }

  return handleApiResponse<Rune[]>(data, true);
};

// Fetch Popular Collections from API (cached version)
export const fetchPopularFromApi = async (): Promise<
  Record<string, unknown>[]
> => {
  const response = await fetch("/api/cached-popular-runes");
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse popular collections");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch popular collections: ${response.statusText}`,
    );
  }
  return handleApiResponse<Record<string, unknown>[]>(data, true);
};

// Fetch Quote from API
export const fetchQuoteFromApi = async (
  params: Record<string, unknown>,
): Promise<QuoteResponse> => {
  const response = await fetch("/api/sats-terminal/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse quote response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch quote: ${response.statusText}`,
    );
  }
  return handleApiResponse<QuoteResponse>(data, false);
};

// Get PSBT from API
export const getPsbtFromApi = async (
  params: GetPSBTParams,
): Promise<Record<string, unknown>> => {
  const response = await fetch("/api/sats-terminal/psbt/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse PSBT response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to create PSBT: ${response.statusText}`,
    );
  }
  return handleApiResponse<Record<string, unknown>>(data, false);
};

// Confirm PSBT via API
export const confirmPsbtViaApi = async (
  params: ConfirmPSBTParams,
): Promise<Record<string, unknown>> => {
  const response = await fetch("/api/sats-terminal/psbt/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse confirmation response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to confirm PSBT: ${response.statusText}`,
    );
  }
  return handleApiResponse<Record<string, unknown>>(data, false);
};

// Fetch BTC Balance from API
export const fetchBtcBalanceFromApi = async (
  address: string,
): Promise<number> => {
  const response = await fetch(
    `/api/ordiscan/btc-balance?address=${encodeURIComponent(address)}`,
  );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to parse BTC balance for ${address}`);
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch BTC balance: ${response.statusText}`,
    );
  }
  const parsedData = handleApiResponse<{ balance: number }>(data, false);
  return parsedData?.balance || 0;
};

// Fetch Rune Balances from API
export const fetchRuneBalancesFromApi = async (
  address: string,
): Promise<OrdiscanRuneBalance[]> => {
  const response = await fetch(
    `/api/ordiscan/rune-balances?address=${encodeURIComponent(address)}`,
  );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to parse rune balances for ${address}`);
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch rune balances: ${response.statusText}`,
    );
  }
  return handleApiResponse<OrdiscanRuneBalance[]>(data, true);
};

// Fetch Rune Info from API
export const fetchRuneInfoFromApi = async (
  name: string,
): Promise<RuneData | null> => {
  const normalizedName = normalizeRuneName(name);
  const response = await fetch(
    `/api/ordiscan/rune-info?name=${encodeURIComponent(normalizedName)}`,
  );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to parse rune info for ${name}`);
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch rune info: ${response.statusText}`,
    );
  }
  // Handle 404 (null) responses
  if (response.status === 404) {
    return null;
  }
  return handleApiResponse<RuneData | null>(data, false);
};

// Update Rune Data via API
export const updateRuneDataViaApi = async (
  name: string,
): Promise<RuneData | null> => {
  const normalizedName = normalizeRuneName(name);
  const response = await fetch("/api/ordiscan/rune-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: normalizedName }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to parse update response for ${name}`);
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to update rune data: ${response.statusText}`,
    );
  }
  // Handle 404 (null) responses
  if (response.status === 404) {
    return null;
  }
  return handleApiResponse<RuneData | null>(data, false);
};

// Fetch Rune Market Info from API
export const fetchRuneMarketFromApi = async (
  name: string,
): Promise<OrdiscanRuneMarketInfo | null> => {
  const normalizedName = normalizeRuneName(name);
  const response = await fetch(
    `/api/ordiscan/rune-market?name=${encodeURIComponent(normalizedName)}`,
  );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to parse market info for ${name}`);
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch market info: ${response.statusText}`,
    );
  }
  // Handle 404 (null) responses
  if (response.status === 404) {
    return null;
  }
  return handleApiResponse<OrdiscanRuneMarketInfo | null>(data, false);
};

// Fetch List Runes from API
export const fetchListRunesFromApi = async (): Promise<OrdiscanRuneInfo[]> => {
  const response = await fetch("/api/ordiscan/list-runes");
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse runes list");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch runes list: ${response.statusText}`,
    );
  }
  return handleApiResponse<OrdiscanRuneInfo[]>(data, true);
};

// Fetch Rune Activity from API
export const fetchRuneActivityFromApi = async (
  address: string,
): Promise<RuneActivityEvent[]> => {
  const response = await fetch(
    `/api/ordiscan/rune-activity?address=${encodeURIComponent(address)}`,
  );
  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(
        `Failed to fetch rune activity: Server responded with status ${response.status}`,
      );
    }
    throw new Error("Failed to parse successful API response.");
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch rune activity: ${response.statusText}`,
    );
  }

  return handleApiResponse<RuneActivityEvent[]>(data, true);
};

// Interface for Price History response
export interface PriceHistoryDataPoint {
  timestamp: number; // Unix timestamp in milliseconds
  price: number; // Price in USD
}

export interface PriceHistoryResponse {
  slug: string;
  prices: PriceHistoryDataPoint[];
  available: boolean;
}

// Fetch Rune Price History from API
export const fetchRunePriceHistoryFromApi = async (
  runeName: string,
): Promise<PriceHistoryResponse> => {
  // Don't send empty requests
  if (!runeName || runeName.trim() === "") {
    return {
      slug: "",
      prices: [],
      available: false,
    };
  }

  // Apply direct formatting to specific runes
  let querySlug = runeName;

  // Special case for LIQUIDIUM•TOKEN
  if (runeName.includes("LIQUIDIUM")) {
    querySlug = "LIQUIDIUMTOKEN";
  }

  const response = await fetch(
    `/api/rune-price-history?slug=${encodeURIComponent(querySlug)}`,
  );
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to parse price history for ${runeName}`);
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch price history: ${response.statusText}`,
    );
  }

  return handleApiResponse<PriceHistoryResponse>(data, false);
};

// Fetch Portfolio Data from API (optimized batch request)
export const fetchPortfolioDataFromApi = async (
  address: string,
): Promise<{
  balances: OrdiscanRuneBalance[];
  runeInfos: Record<string, RuneData>;
  marketData: Record<string, OrdiscanRuneMarketInfo>;
}> => {
  if (!address) {
    return { balances: [], runeInfos: {}, marketData: {} };
  }

  const response = await fetch(
    `/api/portfolio-data?address=${encodeURIComponent(address)}`,
  );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Failed to parse portfolio data for ${address}`);
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch portfolio data: ${response.statusText}`,
    );
  }
  return handleApiResponse<{
    balances: OrdiscanRuneBalance[];
    runeInfos: Record<string, RuneData>;
    marketData: Record<string, OrdiscanRuneMarketInfo>;
  }>(data, false);
};

// Liquidium: Repay Loan (minimal, placeholder)
export interface RepayLiquidiumLoanResponse {
  success: boolean;
  data?: {
    psbt: string;
    repaymentAmountSats: number;
    loanId: string;
    // Add more fields as needed
  };
  error?: string;
}

export const repayLiquidiumLoan = async (
  loanId: string,
  address: string,
): Promise<RepayLiquidiumLoanResponse> => {
  const response = await fetch("/api/liquidium/repay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loanId, address }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse repay response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to repay loan: ${response.statusText}`,
    );
  }
  // Map Liquidium API fields to expected frontend fields without mutating raw response
  if (data?.data) {
    // Create a new transformed data object instead of mutating the original
    const transformedData = {
      success: data.success,
      data: {
        psbt: data.data.base64_psbt || data.data.psbt,
        repaymentAmountSats: data.data.repayment_amount_sats,
        loanId: data.data.offer_id || loanId,
        ...data.data, // Include any other fields from the original data
      },
      error: data.error,
    };
    return transformedData;
  }
  return data;
};

// ... existing code ...

export interface SubmitRepayResponse {
  success: boolean;
  data?: {
    repayment_transaction_id: string;
  };
  error?: string;
}

export const submitRepayPsbt = async (
  loanId: string,
  signedPsbt: string,
  address: string,
): Promise<SubmitRepayResponse> => {
  const response = await fetch("/api/liquidium/repay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loanId, signedPsbt, address }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse repay submission response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to submit repayment: ${response.statusText}`,
    );
  }
  return data;
};

// --- New Liquidium Borrow Types ---
// Response from GET /api/liquidium/borrow/quotes
export interface LiquidiumBorrowQuoteResponse {
  success: boolean;
  runeDetails?: {
    rune_id: string;
    slug: string;
    floor_price_sats: number;
    floor_price_last_updated_at: string;
    common_offer_data: {
      interest_rate: number;
      rune_divisibility: number;
    };
    valid_ranges: {
      rune_amount: { ranges: { min: string; max: string }[] };
      loan_term_days: number[];
    };
    offers: LiquidiumBorrowQuoteOffer[];
  };
  data?: {
    runeDetails: {
      rune_id: string;
      slug: string;
      floor_price_sats: number;
      floor_price_last_updated_at: string;
      common_offer_data: {
        interest_rate: number;
        rune_divisibility: number;
      };
      valid_ranges: {
        rune_amount: { ranges: { min: string; max: string }[] };
        loan_term_days: number[];
      };
      offers: LiquidiumBorrowQuoteOffer[];
    };
  };
  error?: { message: string; details?: string };
}

export interface LiquidiumBorrowQuoteOffer {
  offer_id: string; // UUID
  fungible_amount: number; // Typically 1 for runes? Check API docs
  loan_term_days: number | null;
  ltv_rate: number; // e.g., 80
  loan_breakdown: {
    total_repayment_sats: number;
    principal_sats: number;
    interest_sats: number;
    loan_due_by_date: string; // ISO Date
    activation_fee_sats: number;
    discount: {
      discount_rate: number;
      discount_sats: number;
    };
  };
}

// Response from POST /api/liquidium/borrow/prepare
export interface LiquidiumPrepareBorrowResponse {
  success: boolean;
  data?: {
    prepare_offer_id: string; // UUID
    base64_psbt: string;
    sides: {
      // Array defining which inputs to sign
      index: number;
      address: string | null;
      sighash: number | null;
      disable_tweak_signer: boolean;
    }[];
    // Might include utxo_content warnings like in repay
  };
  error?: string; // Changed to string to match error handling in BorrowTab
}

// Response from POST /api/liquidium/borrow/submit
export interface LiquidiumSubmitBorrowResponse {
  success: boolean;
  data?: {
    loan_transaction_id: string; // txid
  };
  error?: string; // Changed to string to match error handling in BorrowTab
}
// --- End New Liquidium Borrow Types ---

// --- New API Client Functions for Borrow ---

// Fetch Borrow Quotes from API
export const fetchBorrowQuotesFromApi = async (
  runeId: string,
  runeAmount: string, // Raw amount as string
  address: string,
): Promise<LiquidiumBorrowQuoteResponse> => {
  // Ensure we're using the correct rune ID format
  // If we have a rune name like "LIQUIDIUMTOKEN", we'll let the backend handle the lookup

  const url = `/api/liquidium/borrow/quotes?runeId=${encodeURIComponent(runeId)}&runeAmount=${runeAmount}&address=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url);
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Failed to parse borrow quotes for ${runeId}`);
    }

    if (!response.ok) {
      // Extract error message in a more robust way
      let errorMessage = "Unknown error";
      if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (typeof data?.error === "string") {
        errorMessage = data.error;
      } else if (data?.message) {
        errorMessage = data.message;
      } else {
        errorMessage = `Failed to fetch borrow quotes: ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    // Handle both response formats:
    // 1. API might return { success: true, data: { runeDetails: {...} } }
    // 2. Or directly { success: true, runeDetails: {...} }
    if (data.data?.runeDetails && !data.runeDetails) {
      data.runeDetails = data.data.runeDetails;
    }

    return data as LiquidiumBorrowQuoteResponse;
  } catch (error) {
    throw error; // Re-throw to let the component handle it
  }
};

// Prepare Liquidium Borrow Transaction
export const prepareLiquidiumBorrow = async (params: {
  instant_offer_id: string;
  fee_rate: number;
  token_amount: string; // Raw amount as string
  borrower_payment_address: string;
  borrower_payment_pubkey: string;
  borrower_ordinal_address: string;
  borrower_ordinal_pubkey: string;
  address: string; // User's address for JWT lookup
}): Promise<LiquidiumPrepareBorrowResponse> => {
  const response = await fetch("/api/liquidium/borrow/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse prepare borrow response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to prepare borrow: ${response.statusText}`,
    );
  }
  return data as LiquidiumPrepareBorrowResponse;
};

// Submit Liquidium Borrow Transaction
export const submitLiquidiumBorrow = async (params: {
  signed_psbt_base_64: string;
  prepare_offer_id: string;
  address: string; // User's address for JWT lookup
}): Promise<LiquidiumSubmitBorrowResponse> => {
  const response = await fetch("/api/liquidium/borrow/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    // If the response was OK but we couldn't parse JSON, create a synthetic success response
    if (response.ok) {
      return {
        success: true,
        data: {
          loan_transaction_id: params.prepare_offer_id,
        },
      };
    }

    throw new Error("Failed to parse submit borrow response");
  }

  if (!response.ok) {
    const errorMessage =
      data?.error?.message ||
      data?.error ||
      `Failed to submit borrow: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data as LiquidiumSubmitBorrowResponse;
};

// Interface for borrow range response
export interface BorrowRangeResponse {
  success: boolean;
  data?: {
    runeId: string;
    minAmount: string;
    maxAmount: string;
    loanTermDays?: number[];
    cached: boolean;
    updatedAt: string;
  };
  error?: string;
}

// Fetch Borrow Ranges from API
export const fetchBorrowRangesFromApi = async (
  runeId: string,
  address: string,
): Promise<BorrowRangeResponse> => {
  try {
    const url = `/api/liquidium/borrow/ranges?runeId=${encodeURIComponent(runeId)}&address=${encodeURIComponent(address)}`;

    const response = await fetch(url);

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Failed to parse borrow ranges for ${runeId}`);
    }

    if (!response.ok) {
      let errorMessage = "Unknown error";
      if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (typeof data?.error === "string") {
        errorMessage = data.error;
      } else if (data?.message) {
        errorMessage = data.message;
      } else {
        errorMessage = `Failed to fetch borrow ranges: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return data as BorrowRangeResponse;
  } catch (error) {
    throw error;
  }
};
