// Mock dependencies first, before any imports
jest.mock('@/lib/serverUtils');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => ({
          gt: jest.fn(),
        })),
      })),
    })),
  },
}));
jest.mock('@/lib/runesData');
jest.mock('@/lib/runeMarketData');

import { NextRequest } from 'next/server';
import { getRuneMarketData } from '@/lib/runeMarketData';
import { getRuneData } from '@/lib/runesData';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { supabase } from '@/lib/supabase';
import { GET } from './route';

// Get mocked functions
const mockGetOrdiscanClient = jest.mocked(getOrdiscanClient);
const mockSupabase = jest.mocked(supabase);
const mockGetRuneData = jest.mocked(getRuneData);
const mockGetRuneMarketData = jest.mocked(getRuneMarketData);

describe('/api/portfolio-data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRuneBalances = [
    {
      name: 'UNCOMMON•GOODS',
      amount: '1000000',
      decimals: 0,
    },
    {
      name: 'RSIC•METAPROTOCOL',
      amount: '500000',
      decimals: 2,
    },
  ];

  const mockRuneInfos = [
    {
      id: 'rune1',
      name: 'UNCOMMON•GOODS',
      formatted_name: 'UNCOMMON•GOODS',
      decimals: 0,
      symbol: 'UG',
      current_supply: '21000000',
    },
    {
      id: 'rune2',
      name: 'RSIC•METAPROTOCOL',
      formatted_name: 'RSIC•METAPROTOCOL',
      decimals: 2,
      symbol: 'RSIC',
      current_supply: '1000000',
    },
  ];

  const mockMarketData = [
    {
      rune_name: 'UNCOMMON•GOODS',
      price_in_sats: 1000,
      price_in_usd: 0.5,
      market_cap_in_btc: 21,
      market_cap_in_usd: 10500,
    },
    {
      rune_name: 'RSIC•METAPROTOCOL',
      price_in_sats: 2000,
      price_in_usd: 1.0,
      market_cap_in_btc: 10,
      market_cap_in_usd: 5000,
    },
  ];

  const setupMocks = (
    balances: unknown[] | null = mockRuneBalances,
    runeInfosData: unknown[] | null = mockRuneInfos,
    runeInfosError: unknown = null,
    marketData: unknown[] | null = mockMarketData,
    marketError: unknown = null,
    missingRuneData: unknown = null,
    missingMarketData: unknown = null,
  ) => {
    // Mock Ordiscan client
    const mockGetRunes = jest.fn().mockResolvedValue(balances);
    mockGetOrdiscanClient.mockReturnValue({
      address: {
        getRunes: mockGetRunes,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Mock Supabase queries - need to return resolved promises
    const mockRuneInfoQuery = {
      data: runeInfosData,
      error: runeInfosError,
    };
    const mockMarketDataQuery = {
      data: marketData,
      error: marketError,
    };

    const mockGt = jest.fn(() => Promise.resolve(mockMarketDataQuery));
    const mockInRunes = jest.fn(() => Promise.resolve(mockRuneInfoQuery));
    const mockInMarket = jest.fn(() => ({
      gt: mockGt,
    }));
    const mockSelectRunes = jest.fn(() => ({ in: mockInRunes }));
    const mockSelectMarket = jest.fn(() => ({ in: mockInMarket }));

    (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'runes') {
        return { select: mockSelectRunes };
      }
      if (table === 'rune_market_data') {
        return { select: mockSelectMarket };
      }
      return { select: jest.fn() };
    });

    // Mock missing data functions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetRuneData.mockResolvedValue(missingRuneData as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetRuneMarketData.mockResolvedValue(missingMarketData as any);

    return {
      mockGetRunes,
      mockRuneInfoQuery,
      mockMarketDataQuery,
      mockInRunes,
      mockInMarket,
      mockSelectRunes,
      mockSelectMarket,
      mockGt,
    };
  };

  it('should return portfolio data successfully with complete data', async () => {
    setupMocks();

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...test',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.balances).toEqual(mockRuneBalances);

    // The route processes data into maps, so we expect the structure
    expect(data.data.runeInfos).toEqual({
      'UNCOMMON•GOODS': mockRuneInfos[0],
      'RSIC•METAPROTOCOL': mockRuneInfos[1],
    });
    expect(data.data.marketData).toEqual({
      'UNCOMMON•GOODS': {
        price_in_sats: 1000,
        price_in_usd: 0.5,
        market_cap_in_btc: 21,
        market_cap_in_usd: 10500,
      },
      'RSIC•METAPROTOCOL': {
        price_in_sats: 2000,
        price_in_usd: 1.0,
        market_cap_in_btc: 10,
        market_cap_in_usd: 5000,
      },
    });
  });

  it('should return 400 when address is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.message).toBe('Invalid request parameters');
  });

  it('should return 400 when address is empty', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.message).toBe('Invalid request parameters');
  });

  it('should return empty portfolio when address has no rune balances', async () => {
    setupMocks([]); // Empty balances

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...empty',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      balances: [],
      runeInfos: {},
      marketData: {},
    });
  });

  it('should handle non-array balances response from Ordiscan', async () => {
    setupMocks(null); // Non-array response

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...invalid',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      balances: [],
      runeInfos: {},
      marketData: {},
    });
  });

  it('should fetch missing rune info from external API', async () => {
    const missingRuneInfo = {
      id: 'rune3',
      name: 'MISSING•RUNE',
      formatted_name: 'MISSING•RUNE',
      decimals: 0,
      symbol: 'MR',
    };

    setupMocks(
      [{ name: 'MISSING•RUNE', amount: '1000', decimals: 0 }], // balances
      [], // empty rune infos from DB
      null, // no rune info error
      [], // empty market data from DB
      null, // no market data error
      missingRuneInfo, // missing rune data from API
      null, // no missing market data
    );

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...missing',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.runeInfos['MISSING•RUNE']).toEqual(missingRuneInfo);
    expect(mockGetRuneData).toHaveBeenCalledWith('MISSING•RUNE');
  });

  it('should fetch missing market data from external API', async () => {
    const missingMarketData = {
      price_in_sats: 3000,
      price_in_usd: 1.5,
      market_cap_in_btc: 5,
      market_cap_in_usd: 2500,
    };

    setupMocks(
      [{ name: 'MISSING•MARKET', amount: '1000', decimals: 0 }], // balances
      [
        {
          name: 'MISSING•MARKET',
          id: 'rune4',
          formatted_name: 'MISSING•MARKET',
          decimals: 0,
        },
      ], // rune info from DB
      null, // no rune info error
      [], // empty market data from DB
      null, // no market data error
      null, // no missing rune data
      missingMarketData, // missing market data from API
    );

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...missing-market',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.marketData['MISSING•MARKET']).toEqual(missingMarketData);
    expect(mockGetRuneMarketData).toHaveBeenCalledWith('MISSING•MARKET');
  });

  it('should handle Supabase rune info errors gracefully', async () => {
    setupMocks(
      mockRuneBalances,
      null, // null data
      { message: 'Database error' }, // rune info error
      mockMarketData,
      null, // no market data error
    );

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...db-error',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Should still return data, just fetch missing info from external APIs
    expect(data.data.balances).toEqual(mockRuneBalances);
  });

  it('should handle Supabase market data errors gracefully', async () => {
    setupMocks(
      mockRuneBalances,
      mockRuneInfos,
      null, // no rune info error
      null, // null market data
      { message: 'Market data error' }, // market data error
    );

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...market-error',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Should still return data, just fetch missing market data from external APIs
    expect(data.data.balances).toEqual(mockRuneBalances);
  });

  it('should handle Ordiscan API errors', async () => {
    const mockGetRunes = jest
      .fn()
      .mockRejectedValue(new Error('Ordiscan API error'));
    mockGetOrdiscanClient.mockReturnValue({
      address: {
        getRunes: mockGetRunes,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...ordiscan-error',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    // The actual error message from handleApiError includes full stack trace
    expect(data.error.message).toBe('Ordiscan API error');
    expect(data.error.details).toContain('Ordiscan API error');
  });

  it('should handle missing external API data gracefully', async () => {
    setupMocks(
      [{ name: 'UNKNOWN•RUNE', amount: '1000', decimals: 0 }], // balances
      [], // empty rune infos from DB
      null, // no rune info error
      [], // empty market data from DB
      null, // no market data error
      null, // missing rune data returns null
      null, // missing market data returns null
    );

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...unknown',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.balances).toEqual([
      { name: 'UNKNOWN•RUNE', amount: '1000', decimals: 0 },
    ]);
    expect(data.data.runeInfos).toEqual({});
    expect(data.data.marketData).toEqual({});
  });

  it('should batch fetch data efficiently for multiple runes', async () => {
    const { mockInRunes, mockInMarket } = setupMocks();

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...batch',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    // Verify batch queries were made - the actual call includes 'name' as first param
    expect(mockInRunes).toHaveBeenCalledWith('name', [
      'UNCOMMON•GOODS',
      'RSIC•METAPROTOCOL',
    ]);
    expect(mockInMarket).toHaveBeenCalledWith('rune_name', [
      'UNCOMMON•GOODS',
      'RSIC•METAPROTOCOL',
    ]);
  });

  it('should filter market data by last_updated_at timestamp', async () => {
    const { mockGt } = setupMocks();

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio-data?address=bc1p123...timestamp',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    // Verify that gt (greater than) filter was applied
    expect(mockGt).toHaveBeenCalled();
  });
});
