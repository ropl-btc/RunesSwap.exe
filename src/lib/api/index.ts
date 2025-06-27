export * from './satsTerminal';
export * from './ordiscan';
export * from './liquidium';
export * from './coingecko';

export const QUERY_KEYS = {
  POPULAR_RUNES: 'popularRunes',
  RUNE_INFO: 'runeInfo',
  RUNE_MARKET: 'runeMarket',
  RUNE_PRICE_HISTORY: 'runePriceHistory',
  BTC_BALANCE: 'btcBalance',
  RUNE_BALANCES: 'runeBalances',
  RUNE_LIST: 'runesList',
  RUNE_ACTIVITY: 'runeActivity',
  PORTFOLIO_DATA: 'portfolioData',
  LIQUIDIUM_PORTFOLIO: 'liquidiumPortfolio',
  BTC_FEE_RATES: 'btcFeeRates',
} as const;

export type QueryKey = (typeof QUERY_KEYS)[keyof typeof QUERY_KEYS];

import { handleApiResponse } from './utils';

export const fetchPopularFromApi = async (): Promise<
  Record<string, unknown>[]
> => {
  const response = await fetch('/api/cached-popular-runes');
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Failed to parse popular collections');
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

export interface BitcoinFeeRates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export const DEFAULT_FEE_RATES: BitcoinFeeRates = {
  fastestFee: 25,
  halfHourFee: 20,
  hourFee: 15,
  economyFee: 10,
  minimumFee: 5,
};

export const fetchRecommendedFeeRates = async (): Promise<BitcoinFeeRates> => {
  try {
    const response = await fetch(
      'https://mempool.space/api/v1/fees/recommended',
    );

    if (!response.ok) {
      console.warn(
        `Failed to fetch fee rates: ${response.status} ${response.statusText}`,
      );
      return DEFAULT_FEE_RATES;
    }

    const data = await response.json();
    return data as BitcoinFeeRates;
  } catch (error) {
    console.warn('Error fetching recommended fee rates:', error);
    return DEFAULT_FEE_RATES;
  }
};
