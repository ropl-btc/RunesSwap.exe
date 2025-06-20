import {
  type RuneBalance as OrdiscanRuneBalance,
  type RuneInfo as OrdiscanRuneInfo,
  type RuneMarketInfo as OrdiscanRuneMarketInfo,
  type RuneActivityEvent,
} from "@/types/ordiscan";
import { type RuneData } from "../runesData";
import { normalizeRuneName } from "@/utils/runeUtils";
import { handleApiResponse } from "./utils";

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
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to fetch rune info: ${response.statusText}`,
    );
  }
  return handleApiResponse<RuneData | null>(data, false);
};

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
  if (response.status === 404) {
    return null;
  }
  return handleApiResponse<RuneData | null>(data, false);
};

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
  if (response.status === 404) {
    return null;
  }
  return handleApiResponse<OrdiscanRuneMarketInfo | null>(data, false);
};

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

export interface PriceHistoryDataPoint {
  timestamp: number;
  price: number;
}

export interface PriceHistoryResponse {
  slug: string;
  prices: PriceHistoryDataPoint[];
  available: boolean;
}

export const fetchRunePriceHistoryFromApi = async (
  runeName: string,
): Promise<PriceHistoryResponse> => {
  if (!runeName || runeName.trim() === "") {
    return {
      slug: "",
      prices: [],
      available: false,
    };
  }

  let querySlug = runeName;
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
