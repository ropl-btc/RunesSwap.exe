/**
 * Tests for server-side utility functions.
 */

// Mock the external SDK modules before importing
jest.mock('ordiscan');
jest.mock('satsterminal-sdk');

import { Ordiscan } from 'ordiscan';
import { SatsTerminal } from 'satsterminal-sdk';
import { getOrdiscanClient, getSatsTerminalClient } from './serverUtils';

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
});
