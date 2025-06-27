import { LiquidiumApi } from '@/sdk/liquidium';

/**
 * Creates a configured LiquidiumApi instance.
 * Adds Authorization and user JWT headers.
 * Intended for server-side usage only.
 */
export const createLiquidiumClient = (userJwt?: string): LiquidiumApi => {
  const baseUrlRaw =
    process.env.LIQUIDIUM_API_URL || 'https://alpha.liquidium.fi';
  // Remove any trailing slashes so generated SDK paths like "/api/v1/..." concatenate correctly
  const sanitizedBaseUrl = baseUrlRaw.replace(/\/+$/, '');
  const apiKey = process.env.LIQUIDIUM_API_KEY;

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if (userJwt) {
    headers['x-user-token'] = userJwt;
  }

  return new LiquidiumApi({
    BASE: sanitizedBaseUrl,
    HEADERS: headers,
  });
};
