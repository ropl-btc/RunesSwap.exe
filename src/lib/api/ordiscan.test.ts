import { fetchRuneInfoFromApi } from './ordiscan';

beforeEach(() => {
  (global.fetch as unknown as jest.Mock) = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('fetchRuneInfoFromApi', () => {
  it('fetches and returns rune info', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: { name: 'BTC' } }),
    });

    const result = await fetchRuneInfoFromApi('BTC');
    expect(fetch).toHaveBeenCalledWith('/api/ordiscan/rune-info?name=BTC');
    expect(result).toEqual({ name: 'BTC' });
  });

  it('throws on error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'oops',
      json: () => Promise.resolve({ error: 'fail' }),
    });

    await expect(fetchRuneInfoFromApi('FAIL')).rejects.toThrow('fail');
  });
});
