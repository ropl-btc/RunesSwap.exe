import type { LiquidiumFetchResult } from './liquidiumServer';

const realFetch = global.fetch;
const originalEnv = { ...process.env };

describe('callLiquidiumApi', () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    global.fetch = realFetch;
    process.env = originalEnv;
  });

  const loadModule = () => import('./liquidiumServer');

  it('handles a successful JSON response', async () => {
    process.env.LIQUIDIUM_API_KEY = 'test-key';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"foo":"bar"}'),
    });

    const { callLiquidiumApi } = await loadModule();
    const result = await callLiquidiumApi<{ foo: string }>(
      '/path',
      { method: 'GET' },
      'Test',
    );

    expect(result).toEqual({ ok: true, data: { foo: 'bar' }, status: 200 });
  });

  it('handles an ok response with invalid JSON body', async () => {
    process.env.LIQUIDIUM_API_KEY = 'test-key';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('not-json'),
    });

    const { callLiquidiumApi } = await loadModule();
    const result = await callLiquidiumApi<string>(
      '/path',
      { method: 'GET' },
      'Test',
    );

    expect(result).toEqual({ ok: true, data: 'not-json', status: 200 });
  });

  it('handles a non-OK response', async () => {
    process.env.LIQUIDIUM_API_KEY = 'test-key';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('{"error":"BAD"}'),
    });

    const { callLiquidiumApi } = await loadModule();
    const result = await callLiquidiumApi('/path', { method: 'GET' }, 'Test');

    const expected: LiquidiumFetchResult<unknown> = {
      ok: false,
      message: 'Test: BAD',
      details: '{"error":"BAD"}',
      status: 400,
    };
    expect(result).toEqual(expected);
  });

  it('handles missing LIQUIDIUM_API_KEY', async () => {
    delete process.env.LIQUIDIUM_API_KEY;

    const { callLiquidiumApi } = await loadModule();
    const result = await callLiquidiumApi('/path', { method: 'GET' }, 'Test');

    const expected: LiquidiumFetchResult<unknown> = {
      ok: false,
      message: 'Server configuration error',
      details: 'Missing Liquidium API key',
      status: 500,
    };
    expect(result).toEqual(expected);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
