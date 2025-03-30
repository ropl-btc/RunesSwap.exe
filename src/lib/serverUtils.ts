/**
 * Server-side utility functions.
 */

import { Ordiscan } from 'ordiscan';
import { SatsTerminal } from 'satsterminal-sdk';

/**
 * Gets an initialized Ordiscan SDK client instance.
 * Requires ORDISCAN_API_KEY environment variable to be set on the server.
 * 
 * @throws Error if ORDISCAN_API_KEY is not set.
 * @returns Initialized Ordiscan client instance.
 */
export function getOrdiscanClient(): Ordiscan {
  const apiKey = process.env.ORDISCAN_API_KEY;

  if (!apiKey) {
    console.error('Ordiscan API key not found. Please set ORDISCAN_API_KEY environment variable on the server.');
    throw new Error('Server configuration error: Missing Ordiscan API Key');
  }

  // Note: The Ordiscan constructor expects the API key directly.
  return new Ordiscan(apiKey);
}

/**
 * Gets an initialized SatsTerminal SDK client instance.
 * Requires SATS_TERMINAL_API_KEY environment variable to be set on the server.
 * 
 * @throws Error if SATS_TERMINAL_API_KEY is not set.
 * @returns Initialized SatsTerminal client instance.
 */
export function getSatsTerminalClient(): SatsTerminal {
  const apiKey = process.env.SATS_TERMINAL_API_KEY;

  if (!apiKey) {
    console.error('SatsTerminal API key not found. Please set SATS_TERMINAL_API_KEY environment variable on the server.');
    throw new Error('Server configuration error: Missing SatsTerminal API Key');
  }

  // Note: The SatsTerminal constructor expects an options object.
  return new SatsTerminal({ apiKey });
} 