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
    console.error(
      'Ordiscan API key not found. Please set ORDISCAN_API_KEY environment variable on the server.',
    );
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
  const baseUrl = process.env.TBA_API_URL;

  if (!apiKey) {
    console.error(
      'SatsTerminal API key not found. Please set SATS_TERMINAL_API_KEY environment variable on the server.',
    );
    throw new Error('Server configuration error: Missing SatsTerminal API Key');
  }

  // Note: The SatsTerminal constructor expects an options object.
  return new SatsTerminal(baseUrl ? { apiKey, baseUrl } : { apiKey });
}

/**
 * Gets an object for interacting with the Liquidium API securely on the server.
 * Requires the LIQUIDIUM_API_KEY environment variable. The LIQUIDIUM_API_URL
 * variable is optional and defaults to https://alpha.liquidium.wtf if not set.
 */
export function getLiquidiumClient() {
  const apiKey = process.env.LIQUIDIUM_API_KEY;
  const apiUrl = process.env.LIQUIDIUM_API_URL || 'https://alpha.liquidium.wtf';
  if (!apiKey) {
    throw new Error('Server configuration error: Missing Liquidium API Key');
  }
  return {
    async authPrepare(paymentAddress: string, ordinalsAddress: string) {
      const response = await fetch(`${apiUrl}/api/v1/auth/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          payment_address: paymentAddress,
          ordinals_address: ordinalsAddress,
        }),
      });
      if (!response.ok) throw new Error('Liquidium authPrepare failed');
      return response.json();
    },
    async authSubmit(submitData: unknown) {
      const response = await fetch(`${apiUrl}/api/v1/auth/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(submitData),
      });
      if (!response.ok) throw new Error('Liquidium authSubmit failed');
      return response.json();
    },
    async getPortfolio(userJwt: string) {
      const response = await fetch(`${apiUrl}/api/v1/borrower/portfolio`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-user-token': userJwt,
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!response.ok) throw new Error('Liquidium getPortfolio failed');
      return response.json();
    },
  };
}
