/**
 * Tests for server-side utility functions.
 */

// Mock the external SDK modules before importing
jest.mock('ordiscan');
jest.mock('satsterminal-sdk');

import { Ordiscan } from 'ordiscan';
import { SatsTerminal } from 'satsterminal-sdk';
import {
  getLiquidiumClient,
  getOrdiscanClient,
  getSatsTerminalClient,
} from './serverUtils';

const MockedOrdiscan = Ordiscan as jest.MockedClass<typeof Ordiscan>;
const MockedSatsTerminal = SatsTerminal as jest.MockedClass<
  typeof SatsTerminal
>;

describe('serverUtils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset environment variables
    process.env = { ...originalEnv };

    // Clear console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Restore console.error
    jest.restoreAllMocks();
  });

  describe('getOrdiscanClient', () => {
    it('should create Ordiscan client when API key is provided', () => {
      // Set up environment variable
      process.env.ORDISCAN_API_KEY = 'test-ordiscan-key';

      // Mock Ordiscan constructor
      const mockOrdiscanInstance = {} as Ordiscan;
      MockedOrdiscan.mockImplementation(() => mockOrdiscanInstance);

      const client = getOrdiscanClient();

      expect(MockedOrdiscan).toHaveBeenCalledWith('test-ordiscan-key');
      expect(client).toBe(mockOrdiscanInstance);
    });

    it('should throw error when ORDISCAN_API_KEY is missing', () => {
      // Ensure API key is not set
      delete process.env.ORDISCAN_API_KEY;

      expect(() => getOrdiscanClient()).toThrow(
        'Server configuration error: Missing Ordiscan API Key',
      );

      expect(console.error).toHaveBeenCalledWith(
        'Ordiscan API key not found. Please set ORDISCAN_API_KEY environment variable on the server.',
      );
    });

    it('should throw error when ORDISCAN_API_KEY is empty string', () => {
      // Set empty API key
      process.env.ORDISCAN_API_KEY = '';

      expect(() => getOrdiscanClient()).toThrow(
        'Server configuration error: Missing Ordiscan API Key',
      );

      expect(console.error).toHaveBeenCalledWith(
        'Ordiscan API key not found. Please set ORDISCAN_API_KEY environment variable on the server.',
      );
    });
  });

  describe('getSatsTerminalClient', () => {
    it('should create SatsTerminal client with API key only', () => {
      // Set up environment variable
      process.env.SATS_TERMINAL_API_KEY = 'test-sats-terminal-key';

      // Mock SatsTerminal constructor
      const mockSatsTerminalInstance = {} as SatsTerminal;
      MockedSatsTerminal.mockImplementation(() => mockSatsTerminalInstance);

      const client = getSatsTerminalClient();

      expect(MockedSatsTerminal).toHaveBeenCalledWith({
        apiKey: 'test-sats-terminal-key',
      });
      expect(client).toBe(mockSatsTerminalInstance);
    });

    it('should create SatsTerminal client with API key and base URL', () => {
      // Set up environment variables
      process.env.SATS_TERMINAL_API_KEY = 'test-sats-terminal-key';
      process.env.TBA_API_URL = 'https://custom-api.example.com';

      // Mock SatsTerminal constructor
      const mockSatsTerminalInstance = {} as SatsTerminal;
      MockedSatsTerminal.mockImplementation(() => mockSatsTerminalInstance);

      const client = getSatsTerminalClient();

      expect(MockedSatsTerminal).toHaveBeenCalledWith({
        apiKey: 'test-sats-terminal-key',
        baseUrl: 'https://custom-api.example.com',
      });
      expect(client).toBe(mockSatsTerminalInstance);
    });

    it('should throw error when SATS_TERMINAL_API_KEY is missing', () => {
      // Ensure API key is not set
      delete process.env.SATS_TERMINAL_API_KEY;

      expect(() => getSatsTerminalClient()).toThrow(
        'Server configuration error: Missing SatsTerminal API Key',
      );

      expect(console.error).toHaveBeenCalledWith(
        'SatsTerminal API key not found. Please set SATS_TERMINAL_API_KEY environment variable on the server.',
      );
    });

    it('should throw error when SATS_TERMINAL_API_KEY is empty string', () => {
      // Set empty API key
      process.env.SATS_TERMINAL_API_KEY = '';

      expect(() => getSatsTerminalClient()).toThrow(
        'Server configuration error: Missing SatsTerminal API Key',
      );

      expect(console.error).toHaveBeenCalledWith(
        'SatsTerminal API key not found. Please set SATS_TERMINAL_API_KEY environment variable on the server.',
      );
    });
  });

  describe('getLiquidiumClient', () => {
    beforeEach(() => {
      // Mock fetch globally
      global.fetch = jest.fn();
    });

    afterEach(() => {
      // Reset fetch mock
      jest.resetAllMocks();
    });

    it('should create Liquidium client with default URL when API key is provided', () => {
      // Set up environment variable
      process.env.LIQUIDIUM_API_KEY = 'test-liquidium-key';

      const client = getLiquidiumClient();

      expect(client).toHaveProperty('authPrepare');
      expect(client).toHaveProperty('authSubmit');
      expect(client).toHaveProperty('getPortfolio');
      expect(typeof client.authPrepare).toBe('function');
      expect(typeof client.authSubmit).toBe('function');
      expect(typeof client.getPortfolio).toBe('function');
    });

    it('should create Liquidium client with custom URL when provided', () => {
      // Set up environment variables
      process.env.LIQUIDIUM_API_KEY = 'test-liquidium-key';
      process.env.LIQUIDIUM_API_URL = 'https://custom-liquidium.example.com';

      const client = getLiquidiumClient();

      expect(client).toHaveProperty('authPrepare');
      expect(client).toHaveProperty('authSubmit');
      expect(client).toHaveProperty('getPortfolio');
    });

    it('should throw error when LIQUIDIUM_API_KEY is missing', () => {
      // Ensure API key is not set
      delete process.env.LIQUIDIUM_API_KEY;

      expect(() => getLiquidiumClient()).toThrow(
        'Server configuration error: Missing Liquidium API Key',
      );
    });

    it('should throw error when LIQUIDIUM_API_KEY is empty string', () => {
      // Set empty API key
      process.env.LIQUIDIUM_API_KEY = '';

      expect(() => getLiquidiumClient()).toThrow(
        'Server configuration error: Missing Liquidium API Key',
      );
    });

    describe('Liquidium client methods', () => {
      let client: ReturnType<typeof getLiquidiumClient>;

      beforeEach(() => {
        process.env.LIQUIDIUM_API_KEY = 'test-liquidium-key';
        process.env.LIQUIDIUM_API_URL = 'https://test-liquidium.example.com';

        client = getLiquidiumClient();
      });

      describe('authPrepare', () => {
        it('should make correct API call for authPrepare', async () => {
          const mockResponse = { success: true, data: 'test-data' };
          (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          });

          const result = await client.authPrepare(
            'payment-address',
            'ordinals-address',
          );

          expect(global.fetch).toHaveBeenCalledWith(
            'https://test-liquidium.example.com/api/v1/auth/prepare',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: 'Bearer test-liquidium-key',
              },
              body: JSON.stringify({
                payment_address: 'payment-address',
                ordinals_address: 'ordinals-address',
              }),
            },
          );
          expect(result).toEqual(mockResponse);
        });

        it('should throw error when authPrepare request fails', async () => {
          (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 500,
          });

          await expect(
            client.authPrepare('payment-address', 'ordinals-address'),
          ).rejects.toThrow('Liquidium authPrepare failed');
        });
      });

      describe('authSubmit', () => {
        it('should make correct API call for authSubmit', async () => {
          const mockResponse = { success: true, token: 'test-token' };
          const submitData = { signature: 'test-signature' };

          (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          });

          const result = await client.authSubmit(submitData);

          expect(global.fetch).toHaveBeenCalledWith(
            'https://test-liquidium.example.com/api/v1/auth/submit',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: 'Bearer test-liquidium-key',
              },
              body: JSON.stringify(submitData),
            },
          );
          expect(result).toEqual(mockResponse);
        });

        it('should throw error when authSubmit request fails', async () => {
          (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 400,
          });

          await expect(
            client.authSubmit({ signature: 'test-signature' }),
          ).rejects.toThrow('Liquidium authSubmit failed');
        });
      });

      describe('getPortfolio', () => {
        it('should make correct API call for getPortfolio', async () => {
          const mockResponse = { success: true, portfolio: [] };

          (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          });

          const result = await client.getPortfolio('test-jwt-token');

          expect(global.fetch).toHaveBeenCalledWith(
            'https://test-liquidium.example.com/api/v1/borrower/portfolio',
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'x-user-token': 'test-jwt-token',
                Authorization: 'Bearer test-liquidium-key',
              },
            },
          );
          expect(result).toEqual(mockResponse);
        });

        it('should throw error when getPortfolio request fails', async () => {
          (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 401,
          });

          await expect(client.getPortfolio('test-jwt-token')).rejects.toThrow(
            'Liquidium getPortfolio failed',
          );
        });
      });

      it('should use default URL when LIQUIDIUM_API_URL is not set', async () => {
        // Reset environment to test default URL
        delete process.env.LIQUIDIUM_API_URL;
        process.env.LIQUIDIUM_API_KEY = 'test-liquidium-key';

        const defaultClient = getLiquidiumClient();

        const mockResponse = { success: true };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await defaultClient.authPrepare('payment-address', 'ordinals-address');

        expect(global.fetch).toHaveBeenCalledWith(
          'https://alpha.liquidium.wtf/api/v1/auth/prepare',
          expect.any(Object),
        );
      });
    });
  });
});
