// Mock environment variables at the top level
const mockEnv = {
  LIQUIDIUM_API_URL: 'https://test.liquidium.wtf',
  LIQUIDIUM_API_KEY: 'test-api-key',
};

// Mock process.env
Object.defineProperty(process, 'env', {
  value: mockEnv,
  writable: true,
});

import {
  type LiquidiumFetchResult,
  type LiquidiumRequestOptions,
  callLiquidiumApi,
} from './liquidiumServer';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('callLiquidiumApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure environment variables are set for each test
    process.env.LIQUIDIUM_API_URL = 'https://test.liquidium.wtf';
    process.env.LIQUIDIUM_API_KEY = 'test-api-key';
  });

  describe('successful responses', () => {
    it('handles successful JSON response', async () => {
      const mockData = { id: 1, name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
      });

      const result: LiquidiumFetchResult<typeof mockData> =
        await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: true,
        data: mockData,
        status: 200,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.liquidium.wtf/test',
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
        },
      );
    });

    it('handles successful response with empty body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue(''),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: true,
        data: undefined,
        status: 204,
      });
    });

    it('handles successful response with non-JSON text when response is ok', async () => {
      const textResponse = 'Plain text response';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(textResponse),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: true,
        data: textResponse,
        status: 200,
      });
    });

    it('includes user JWT in headers when provided', async () => {
      const mockData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
      });

      const options: LiquidiumRequestOptions = {
        userJwt: 'user-jwt-token',
        method: 'POST',
      };

      await callLiquidiumApi('/test', options, 'Test context');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.liquidium.wtf/test',
        {
          method: 'POST',
          userJwt: 'user-jwt-token',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
            'x-user-token': 'user-jwt-token',
          },
        },
      );
    });

    it('merges custom headers with default headers', async () => {
      const mockData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
      });

      const options: LiquidiumRequestOptions = {
        headers: {
          'Custom-Header': 'custom-value',
          'Content-Type': 'application/x-www-form-urlencoded', // Override
        },
      };

      await callLiquidiumApi('/test', options, 'Test context');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.liquidium.wtf/test',
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer test-api-key',
            'Custom-Header': 'custom-value',
          },
        },
      );
    });
  });

  describe('error responses', () => {
    it('returns error when API key is missing', async () => {
      // Temporarily remove API key
      const originalApiKey = process.env.LIQUIDIUM_API_KEY;
      delete process.env.LIQUIDIUM_API_KEY;

      // Clear module cache and re-import to get fresh environment
      jest.resetModules();
      const { callLiquidiumApi: testCallLiquidiumApi } = await import(
        './liquidiumServer'
      );

      const result = await testCallLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Server configuration error',
        details: 'Missing Liquidium API key',
        status: 500,
      });
      expect(mockFetch).not.toHaveBeenCalled();

      // Restore API key
      process.env.LIQUIDIUM_API_KEY = originalApiKey;
    });

    it('handles HTTP error with JSON error response', async () => {
      const errorResponse = { errorMessage: 'Invalid request' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue(JSON.stringify(errorResponse)),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context: Invalid request',
        details: JSON.stringify(errorResponse),
        status: 400,
      });
    });

    it('handles HTTP error with error field in JSON response', async () => {
      const errorResponse = { error: 'Authentication failed' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue(JSON.stringify(errorResponse)),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context: Authentication failed',
        details: JSON.stringify(errorResponse),
        status: 401,
      });
    });

    it('handles HTTP error with statusText fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('{}'),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context: Internal Server Error',
        details: '{}',
        status: 500,
      });
    });

    it('handles HTTP error with generic error fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: '',
        text: jest.fn().mockResolvedValue('{}'),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context: Error',
        details: '{}',
        status: 500,
      });
    });

    it('handles HTTP error with string response details', async () => {
      const errorText = 'Server temporarily unavailable';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: jest.fn().mockResolvedValue(JSON.stringify(errorText)),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context: Service Unavailable',
        details: errorText, // The JSON.parsed string becomes just the string
        status: 503,
      });
    });

    it('handles invalid JSON in 500 error response', async () => {
      const invalidJson = 'Invalid JSON response';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue(invalidJson),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context returned invalid JSON',
        details: 'Invalid JSON response',
        status: 500,
      });
    });

    it('handles invalid JSON in 400 error response', async () => {
      const invalidJson = 'Invalid JSON in bad request';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue(invalidJson),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context returned invalid JSON',
        details: 'Invalid JSON in bad request',
        status: 500,
      });
    });

    it('truncates long error details to 100 characters', async () => {
      const longErrorText = 'A'.repeat(200);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue(longErrorText),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result.details).toHaveLength(100);
      expect(result.details).toBe('A'.repeat(100));
    });
  });

  describe('network errors', () => {
    it('handles fetch network error', async () => {
      const networkError = new Error('Network connection failed');
      mockFetch.mockRejectedValueOnce(networkError);

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context failed',
        details: 'Network connection failed',
        status: 500,
      });
    });

    it('handles non-Error exception', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context failed',
        details: 'String error',
        status: 500,
      });
    });

    it('handles text() method failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockRejectedValue(new Error('Text parsing failed')),
      });

      const result = await callLiquidiumApi('/test', {}, 'Test context');

      expect(result).toEqual({
        ok: false,
        message: 'Test context failed',
        details: 'Text parsing failed',
        status: 500,
      });
    });
  });

  describe('environment configuration', () => {
    it('uses default API URL when LIQUIDIUM_API_URL is not set', async () => {
      // Temporarily remove API URL
      const originalApiUrl = process.env.LIQUIDIUM_API_URL;
      delete process.env.LIQUIDIUM_API_URL;

      // Clear module cache and re-import to get fresh environment
      jest.resetModules();
      const { callLiquidiumApi: testCallLiquidiumApi } = await import(
        './liquidiumServer'
      );

      const mockData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
      });

      await testCallLiquidiumApi('/test', {}, 'Test context');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://alpha.liquidium.wtf/test',
        expect.any(Object),
      );

      // Restore API URL
      process.env.LIQUIDIUM_API_URL = originalApiUrl;
    });

    it('uses custom API URL when LIQUIDIUM_API_URL is set', async () => {
      // Set custom API URL
      const originalApiUrl = process.env.LIQUIDIUM_API_URL;
      process.env.LIQUIDIUM_API_URL = 'https://custom.liquidium.com';

      // Clear module cache and re-import to get fresh environment
      jest.resetModules();
      const { callLiquidiumApi: testCallLiquidiumApi } = await import(
        './liquidiumServer'
      );

      const mockData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
      });

      await testCallLiquidiumApi('/test', {}, 'Test context');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.liquidium.com/test',
        expect.any(Object),
      );

      // Restore original API URL
      process.env.LIQUIDIUM_API_URL = originalApiUrl;
    });
  });
});
