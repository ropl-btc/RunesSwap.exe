import { COINGECKO_BTC_PRICE_URL, getBtcPrice } from './coingecko';

describe('getBtcPrice', () => {
  beforeEach(() => {
    (global.fetch as unknown as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the BTC price on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ bitcoin: { usd: 30000 } }),
    });

    const price = await getBtcPrice();
    expect(fetch).toHaveBeenCalledWith(COINGECKO_BTC_PRICE_URL);
    expect(price).toBe(30000);
  });

  it('throws when bitcoin.usd is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ bitcoin: {} }),
    });

    await expect(getBtcPrice()).rejects.toThrow(
      'Invalid response format from CoinGecko',
    );
  });

  it('throws when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Error',
      json: () => Promise.resolve({}),
    });

    await expect(getBtcPrice()).rejects.toThrow(
      'Failed to fetch BTC price from CoinGecko',
    );
  });
});
