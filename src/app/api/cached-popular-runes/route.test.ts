import * as popularRunesCache from '@/lib/popularRunesCache';
import { GET } from './route';

// Mock the cache functions
jest.mock('@/lib/popularRunesCache');
const mockGetCachedPopularRunesWithMetadata = jest.fn();
const mockUpdateLastRefreshAttempt = jest.fn();
const mockCachePopularRunes = jest.fn();

const mockedPopularRunesCache = jest.mocked(popularRunesCache);
mockedPopularRunesCache.getCachedPopularRunesWithMetadata =
  mockGetCachedPopularRunesWithMetadata;
mockedPopularRunesCache.updateLastRefreshAttempt = mockUpdateLastRefreshAttempt;
mockedPopularRunesCache.cachePopularRunes = mockCachePopularRunes;

// Mock the SatsTerminal client
const mockPopularTokens = jest.fn();
jest.mock('@/lib/serverUtils', () => ({
  getSatsTerminalClient: jest.fn(() => ({
    popularTokens: mockPopularTokens,
  })),
}));

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('/api/cached-popular-runes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  const mockCachedData = [
    {
      id: 'test-rune-1',
      name: 'TEST•RUNE•ONE',
      rune: 'TEST•RUNE•ONE',
      imageURI: 'https://example.com/test1.png',
    },
    {
      id: 'test-rune-2',
      name: 'TEST•RUNE•TWO',
      rune: 'TEST•RUNE•TWO',
      imageURI: 'https://example.com/test2.png',
    },
  ];

  const mockFreshData = [
    {
      id: 'fresh-rune-1',
      name: 'FRESH•RUNE•ONE',
      rune: 'FRESH•RUNE•ONE',
      imageURI: 'https://example.com/fresh1.png',
    },
  ];

  describe('when cached data exists and is fresh', () => {
    it('should return cached data immediately without refresh', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: false,
        shouldAttemptRefresh: false,
        isStale: false,
        lastRefreshAttempt: Date.now() - 1000,
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toEqual({
        success: true,
        data: {
          data: mockCachedData,
          isStale: false,
          cacheAge: expect.any(String),
        },
      });

      // Should not attempt to refresh or update timestamp
      expect(mockUpdateLastRefreshAttempt).not.toHaveBeenCalled();
      expect(mockPopularTokens).not.toHaveBeenCalled();
    });
  });

  describe('when cached data exists but should refresh', () => {
    it('should return cached data and trigger background refresh', async () => {
      const lastRefreshTime = Date.now() - 1000;
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: lastRefreshTime,
      });

      mockUpdateLastRefreshAttempt.mockResolvedValue(undefined);
      mockPopularTokens.mockResolvedValue(mockFreshData);
      mockCachePopularRunes.mockResolvedValue(undefined);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toEqual({
        success: true,
        data: {
          data: mockCachedData,
          isStale: false,
          cacheAge: new Date(lastRefreshTime).toISOString(),
        },
      });

      // Should update refresh timestamp immediately
      expect(mockUpdateLastRefreshAttempt).toHaveBeenCalledTimes(1);

      // Background refresh should be triggered (but we can't easily test the async nature)
      // We'll test the background refresh function behavior separately
    });

    it('should handle background refresh failure gracefully', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: Date.now() - 1000,
      });

      mockUpdateLastRefreshAttempt.mockResolvedValue(undefined);
      mockPopularTokens.mockRejectedValue(new Error('API Error'));

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.data).toEqual(mockCachedData);

      // Should still update refresh timestamp
      expect(mockUpdateLastRefreshAttempt).toHaveBeenCalledTimes(1);
    });
  });

  describe('when no cached data exists (first run)', () => {
    it('should fetch data synchronously and cache it', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: null,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: null,
      });

      mockPopularTokens.mockResolvedValue(mockFreshData);
      mockCachePopularRunes.mockResolvedValue(undefined);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toEqual({
        success: true,
        data: mockFreshData,
      });

      expect(mockPopularTokens).toHaveBeenCalledWith({});
      expect(mockCachePopularRunes).toHaveBeenCalledWith(mockFreshData);
    });

    it('should handle invalid API response format', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: null,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: null,
      });

      mockPopularTokens.mockResolvedValue({ invalid: 'format' });

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.isStale).toBe(false);
      expect(data.data.error).toBe('Failed to fetch fresh data');

      expect(mockCachePopularRunes).not.toHaveBeenCalled();
    });

    it('should handle null API response', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: null,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: null,
      });

      mockPopularTokens.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.isStale).toBe(false);
      expect(data.data.error).toBe('Failed to fetch fresh data');

      expect(mockCachePopularRunes).not.toHaveBeenCalled();
    });

    it('should return fallback data when API fails and cache returns fallback', async () => {
      const fallbackData = [
        {
          id: 'liquidiumtoken',
          rune: 'LIQUIDIUM•TOKEN',
          name: 'LIQUIDIUM•TOKEN',
          imageURI: 'https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN',
          etching: { runeName: 'LIQUIDIUM•TOKEN' },
        },
      ];

      // First call returns no cache
      mockGetCachedPopularRunesWithMetadata.mockResolvedValueOnce({
        cachedData: null,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: null,
      });

      // Second call (after API failure) returns fallback data
      mockGetCachedPopularRunesWithMetadata.mockResolvedValueOnce({
        cachedData: fallbackData,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: null,
      });

      mockPopularTokens.mockRejectedValue(new Error('API Error'));

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.data).toEqual(fallbackData);
      expect(data.data.isStale).toBe(false);
      expect(data.data.error).toBe('Failed to fetch fresh data');
    });
  });

  describe('error handling', () => {
    it('should handle cache metadata fetch errors', async () => {
      mockGetCachedPopularRunesWithMetadata.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await GET();

      expect(response.status).toBe(500);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Database connection failed');
    });

    it('should handle updateLastRefreshAttempt errors gracefully', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: Date.now() - 1000,
      });

      mockUpdateLastRefreshAttempt.mockRejectedValue(
        new Error('Update failed'),
      );
      mockPopularTokens.mockResolvedValue(mockFreshData);

      const response = await GET();

      // Should still return cached data successfully
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.data).toEqual(mockCachedData);
    });
  });

  describe('background refresh behavior', () => {
    it('should not trigger background refresh when cache is stale', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: true, // Stale data should not trigger background refresh
        lastRefreshAttempt: Date.now() - 1000,
      });

      const response = await GET();

      expect(response.status).toBe(200);

      // Should not update refresh timestamp for stale data
      expect(mockUpdateLastRefreshAttempt).not.toHaveBeenCalled();
      expect(mockPopularTokens).not.toHaveBeenCalled();
    });

    it('should handle caching errors during background refresh', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: Date.now() - 1000,
      });

      mockUpdateLastRefreshAttempt.mockResolvedValue(undefined);
      mockPopularTokens.mockResolvedValue(mockFreshData);
      mockCachePopularRunes.mockRejectedValue(new Error('Cache write failed'));

      const response = await GET();

      // Should still return cached data successfully
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.data).toEqual(mockCachedData);

      expect(mockUpdateLastRefreshAttempt).toHaveBeenCalledTimes(1);
    });
  });

  describe('response format validation', () => {
    it('should return correct response format for fresh cache', async () => {
      const lastRefreshTime = Date.now() - 5000;
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: false,
        shouldAttemptRefresh: false,
        isStale: false,
        lastRefreshAttempt: lastRefreshTime,
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.data).toEqual(mockCachedData);
      expect(data.data.isStale).toBe(false);
      expect(data.data.cacheAge).toBe(new Date(lastRefreshTime).toISOString());
    });

    it('should return correct response format for expired cache', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: Date.now() - 1000,
      });

      mockUpdateLastRefreshAttempt.mockResolvedValue(undefined);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data.isStale).toBe(false);
    });

    it('should handle null lastRefreshAttempt', async () => {
      mockGetCachedPopularRunesWithMetadata.mockResolvedValue({
        cachedData: mockCachedData,
        isExpired: false,
        shouldAttemptRefresh: false,
        isStale: false,
        lastRefreshAttempt: null,
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data.cacheAge).toBe(null);
    });
  });
});
