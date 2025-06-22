import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useLiquidiumAuth } from './useLiquidiumAuth';

type HookProps = Parameters<typeof useLiquidiumAuth>[0];

function renderHook(props: HookProps) {
  let result: ReturnType<typeof useLiquidiumAuth>;
  function TestComponent(p: HookProps) {
    result = useLiquidiumAuth(p);
    return null;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(<TestComponent {...props} />);
  });
  return {
    get result() {
      return result!;
    },
    unmount() {
      act(() => {
        root.unmount();
      });
    },
  };
}

describe('useLiquidiumAuth', () => {
  beforeAll(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    (global as unknown as { window: Window }).window =
      dom.window as unknown as Window;
    (global as unknown as { document: Document }).document =
      dom.window.document;
  });

  afterAll(() => {
    (
      global as unknown as { window: Window & { close: () => void } }
    ).window.close();
  });

  beforeEach(() => {
    (global.fetch as unknown as jest.Mock) = jest.fn();
    jest.clearAllMocks();
  });

  it('authenticates successfully with valid challenge', async () => {
    // initial checkAuth response
    (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 401 });

    // challenge response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            ordinals: { message: 'ord-msg', nonce: 'ord-nonce' },
            payment: { message: 'pay-msg', nonce: 'pay-nonce' },
          },
        }),
    });

    // auth response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // fetchLiquidiumLoans response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const signMessage = jest.fn().mockResolvedValue('sig');

    const hook = renderHook({
      address: 'addr',
      paymentAddress: 'paddr',
      signMessage,
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await hook.result.handleLiquidiumAuth();
    });

    expect(signMessage).toHaveBeenCalledWith('ord-msg', 'addr');
    expect(signMessage).toHaveBeenCalledWith('pay-msg', 'paddr');
    expect(hook.result.liquidiumAuthenticated).toBe(true);
    expect(hook.result.authError).toBeNull();
    hook.unmount();
  });

  it('handles challenge failure', async () => {
    // initial checkAuth response
    (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 401 });

    // challenge failure
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'fail' }),
    });

    const signMessage = jest.fn();
    const hook = renderHook({
      address: 'addr',
      paymentAddress: 'paddr',
      signMessage,
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await hook.result.handleLiquidiumAuth();
    });

    expect(signMessage).not.toHaveBeenCalled();
    expect(hook.result.liquidiumAuthenticated).toBe(false);
    expect(hook.result.authError).toBe('fail');
    hook.unmount();
  });

  it('fails when wallet lacks signMessage', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 401 });

    const hook = renderHook({
      address: 'addr',
      paymentAddress: 'paddr',
      signMessage: undefined,
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await hook.result.handleLiquidiumAuth();
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1); // only checkAuth
    expect(hook.result.liquidiumAuthenticated).toBe(false);
    expect(hook.result.authError).toBe(
      'Your wallet does not support message signing',
    );
    hook.unmount();
  });
});
