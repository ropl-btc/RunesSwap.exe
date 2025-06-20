import {
  fetchRunesFromApi,
  fetchPopularFromApi,
  fetchRuneInfoFromApi,
  fetchBtcBalanceFromApi,
  fetchRuneActivityFromApi,
  fetchRunePriceHistoryFromApi,
  QUERY_KEYS,
} from "./api";

// Mock the global fetch function
global.fetch = jest.fn();

// Helper to mock fetch responses
const mockFetchResponse = (data: unknown, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    statusText: ok ? "OK" : status === 404 ? "Not Found" : "Error",
    json: () => Promise.resolve(data),
  } as Response);

describe("apiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("QUERY_KEYS", () => {
    it("exports the expected query keys", () => {
      expect(QUERY_KEYS).toHaveProperty("POPULAR_RUNES");
      expect(QUERY_KEYS).toHaveProperty("RUNE_INFO");
      expect(QUERY_KEYS).toHaveProperty("RUNE_MARKET");
      expect(QUERY_KEYS).toHaveProperty("BTC_BALANCE");
      expect(QUERY_KEYS).toHaveProperty("RUNE_BALANCES");
      expect(QUERY_KEYS).toHaveProperty("RUNE_ACTIVITY");
      expect(QUERY_KEYS).toHaveProperty("PORTFOLIO_DATA");
    });
  });

  // We can't test handleApiResponse directly as it's not exported
  // Instead, we test it indirectly through the exported functions

  describe("fetchRunesFromApi", () => {
    it("returns empty array for empty query", async () => {
      const result = await fetchRunesFromApi("");
      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("fetches and processes runes data successfully", async () => {
      const mockRunes = [
        { id: "1", name: "RUNE1" },
        { id: "2", name: "RUNE2" },
      ];

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: mockRunes }),
      );

      const result = await fetchRunesFromApi("test");

      expect(fetch).toHaveBeenCalledWith(
        "/api/sats-terminal/search?query=test",
      );
      expect(result).toEqual(mockRunes);
    });

    it("handles direct array response (backward compatibility)", async () => {
      const mockRunes = [
        { id: "1", name: "RUNE1" },
        { id: "2", name: "RUNE2" },
      ];

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockRunes),
      );

      const result = await fetchRunesFromApi("test");

      expect(fetch).toHaveBeenCalledWith(
        "/api/sats-terminal/search?query=test",
      );
      expect(result).toEqual(mockRunes);
    });

    it("returns empty array when success response has non-array data", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: { notAnArray: true } }),
      );

      const result = await fetchRunesFromApi("test");

      expect(fetch).toHaveBeenCalledWith(
        "/api/sats-terminal/search?query=test",
      );
      expect(result).toEqual([]);
    });

    it("throws error for non-OK response", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ error: "Not found" }, false, 404),
      );

      await expect(fetchRunesFromApi("test")).rejects.toThrow("Not found");
      expect(fetch).toHaveBeenCalledWith(
        "/api/sats-terminal/search?query=test",
      );
    });

    it("throws error for JSON parse failure", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error("Invalid JSON")),
        } as Response),
      );

      await expect(fetchRunesFromApi("test")).rejects.toThrow(
        "Failed to parse search results",
      );
      expect(fetch).toHaveBeenCalledWith(
        "/api/sats-terminal/search?query=test",
      );
    });
  });

  describe("fetchPopularFromApi", () => {
    it("fetches and processes popular collections successfully", async () => {
      const mockPopular = [
        { id: "1", name: "POPULAR1" },
        { id: "2", name: "POPULAR2" },
      ];

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: mockPopular }),
      );

      const result = await fetchPopularFromApi();

      expect(fetch).toHaveBeenCalledWith("/api/cached-popular-runes");
      expect(result).toEqual(mockPopular);
    });

    it("throws error for non-OK response", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ error: "Server error" }, false, 500),
      );

      await expect(fetchPopularFromApi()).rejects.toThrow("Server error");
      expect(fetch).toHaveBeenCalledWith("/api/cached-popular-runes");
    });

    it("throws error for JSON parse failure", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error("Invalid JSON")),
        } as Response),
      );

      await expect(fetchPopularFromApi()).rejects.toThrow(
        "Failed to parse popular collections",
      );
      expect(fetch).toHaveBeenCalledWith("/api/cached-popular-runes");
    });
  });

  describe("fetchRuneInfoFromApi", () => {
    it("normalizes rune name by removing bullet characters", async () => {
      const mockRuneInfo = { id: "1", name: "RUNE", decimals: 8 };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: mockRuneInfo }),
      );

      await fetchRuneInfoFromApi("RUNE•TEST");

      expect(fetch).toHaveBeenCalledWith(
        "/api/ordiscan/rune-info?name=RUNETEST",
      );
    });

    it("fetches and processes rune info successfully", async () => {
      const mockRuneInfo = { id: "1", name: "RUNE", decimals: 8 };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: mockRuneInfo }),
      );

      const result = await fetchRuneInfoFromApi("RUNE");

      expect(fetch).toHaveBeenCalledWith("/api/ordiscan/rune-info?name=RUNE");
      expect(result).toEqual(mockRuneInfo);
    });

    it("returns null for 404 responses", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ error: "Not found" }, false, 404),
      );

      const result = await fetchRuneInfoFromApi("NONEXISTENT");
      expect(result).toBeNull();
      expect(fetch).toHaveBeenCalledWith(
        "/api/ordiscan/rune-info?name=NONEXISTENT",
      );
    });

    it("throws error for server errors", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ error: "Server error" }, false, 500),
      );

      await expect(fetchRuneInfoFromApi("RUNE")).rejects.toThrow(
        "Server error",
      );
      expect(fetch).toHaveBeenCalledWith("/api/ordiscan/rune-info?name=RUNE");
    });
  });

  describe("fetchBtcBalanceFromApi", () => {
    it("fetches and processes BTC balance successfully", async () => {
      const mockBalance = { balance: 123456 };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: mockBalance }),
      );

      const result = await fetchBtcBalanceFromApi("bc1qtest");

      expect(fetch).toHaveBeenCalledWith(
        "/api/ordiscan/btc-balance?address=bc1qtest",
      );
      expect(result).toBe(123456);
    });

    it("returns 0 for missing balance data", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: {} }),
      );

      const result = await fetchBtcBalanceFromApi("bc1qtest");

      expect(fetch).toHaveBeenCalledWith(
        "/api/ordiscan/btc-balance?address=bc1qtest",
      );
      expect(result).toBe(0);
    });

    it("returns 0 when API returns null data", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: null }),
      );

      const result = await fetchBtcBalanceFromApi("bc1qtest");

      expect(fetch).toHaveBeenCalledWith(
        "/api/ordiscan/btc-balance?address=bc1qtest",
      );
      expect(result).toBe(0);
    });

    it("throws error for non-OK response", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ error: "Server error" }, false, 500),
      );

      await expect(fetchBtcBalanceFromApi("bc1qtest")).rejects.toThrow(
        "Server error",
      );
      expect(fetch).toHaveBeenCalledWith(
        "/api/ordiscan/btc-balance?address=bc1qtest",
      );
    });
  });

  describe("fetchRuneActivityFromApi", () => {
    it("throws error when JSON parsing fails on error response", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Error",
          json: () => Promise.reject(new Error("Invalid")),
        } as Response),
      );

      await expect(fetchRuneActivityFromApi("addr")).rejects.toThrow(
        "Failed to fetch rune activity: Server responded with status 500",
      );
      expect(fetch).toHaveBeenCalledWith(
        "/api/ordiscan/rune-activity?address=addr",
      );
    });

    it("throws parse error for malformed success response", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.reject(new Error("Invalid")),
        } as Response),
      );

      await expect(fetchRuneActivityFromApi("addr")).rejects.toThrow(
        "Failed to parse successful API response.",
      );
      expect(fetch).toHaveBeenCalledWith(
        "/api/ordiscan/rune-activity?address=addr",
      );
    });
  });

  describe("fetchRunePriceHistoryFromApi", () => {
    it("returns default response for empty rune name", async () => {
      const result = await fetchRunePriceHistoryFromApi("");
      expect(result).toEqual({ slug: "", prices: [], available: false });
      expect(fetch).not.toHaveBeenCalled();
    });

    it("formats slug for LIQUIDIUM runes", async () => {
      const mockHistory = {
        slug: "LIQUIDIUMTOKEN",
        prices: [],
        available: true,
      };
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({ success: true, data: mockHistory }),
      );

      const result = await fetchRunePriceHistoryFromApi("LIQUIDIUM•TOKEN");

      expect(fetch).toHaveBeenCalledWith(
        "/api/rune-price-history?slug=LIQUIDIUMTOKEN",
      );
      expect(result).toEqual(mockHistory);
    });
  });
});
