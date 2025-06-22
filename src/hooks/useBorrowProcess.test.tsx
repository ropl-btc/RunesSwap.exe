import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useBorrowProcess } from './useBorrowProcess';

jest.mock('@/lib/api', () => ({
  prepareLiquidiumBorrow: jest.fn(),
  submitLiquidiumBorrow: jest.fn(),
}));

const { prepareLiquidiumBorrow, submitLiquidiumBorrow } =
  jest.requireMock('@/lib/api');

type HookProps = Parameters<typeof useBorrowProcess>[0];

beforeAll(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  (global as unknown as { window: Window }).window =
    dom.window as unknown as Window;
  (global as unknown as { document: Document }).document = dom.window.document;
});

afterAll(() => {
  (
    global as unknown as { window: Window & { close: () => void } }
  ).window.close();
});

function renderHook(props: HookProps) {
  let result: ReturnType<typeof useBorrowProcess>;
  function TestComponent(p: HookProps) {
    result = useBorrowProcess(p);
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

const mockRuneInfo = {
  decimals: 2,
} as unknown as import('@/lib/runesData').RuneData;

function baseProps(overrides: Partial<HookProps> = {}): HookProps {
  return {
    signPsbt: jest
      .fn()
      .mockResolvedValue({ signedPsbtBase64: 'signed', signedPsbtHex: 'hex' }),
    address: 'addr',
    paymentAddress: 'pay',
    publicKey: 'pub',
    paymentPublicKey: 'ppub',
    collateralRuneInfo: mockRuneInfo,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useBorrowProcess', () => {
  it('creates a loan successfully', async () => {
    (prepareLiquidiumBorrow as jest.Mock).mockResolvedValue({
      success: true,
      data: { base64_psbt: 'psbt', prepare_offer_id: 'prep', sides: [] },
    });
    (submitLiquidiumBorrow as jest.Mock).mockResolvedValue({
      success: true,
      data: { loan_transaction_id: 'tx123' },
    });

    const hook = renderHook(baseProps());

    await act(async () => {
      await hook.result.startLoan('prep', '1', 5);
    });

    expect(hook.result.loanProcessError).toBeNull();
    expect(hook.result.loanTxId).toBe('tx123');
    expect(hook.result.isPreparing).toBe(false);
    expect(hook.result.isSigning).toBe(false);
    expect(hook.result.isSubmitting).toBe(false);

    hook.unmount();
  });

  it('handles missing information', async () => {
    const hook = renderHook(baseProps());

    await act(async () => {
      await hook.result.startLoan(null, '', 5);
    });

    expect(hook.result.loanProcessError).toBe(
      'Missing required information (quote or amount).',
    );
    expect(hook.result.loanTxId).toBeNull();
    expect(hook.result.isPreparing).toBe(false);
    expect(hook.result.isSigning).toBe(false);
    expect(hook.result.isSubmitting).toBe(false);
  });

  it('handles prepare failure', async () => {
    (prepareLiquidiumBorrow as jest.Mock).mockResolvedValue({
      success: false,
      error: 'prepare failed',
    });

    const hook = renderHook(baseProps());

    await act(async () => {
      await hook.result.startLoan('id', '1', 5);
    });

    expect(hook.result.loanProcessError).toBe('prepare failed');
    expect(hook.result.loanTxId).toBeNull();
    expect(hook.result.isPreparing).toBe(false);
    expect(hook.result.isSigning).toBe(false);
    expect(hook.result.isSubmitting).toBe(false);
  });

  it('handles sign cancellation', async () => {
    (prepareLiquidiumBorrow as jest.Mock).mockResolvedValue({
      success: true,
      data: { base64_psbt: 'psbt', prepare_offer_id: 'prep', sides: [] },
    });

    const hook = renderHook(
      baseProps({ signPsbt: jest.fn().mockResolvedValue(undefined) }),
    );

    await act(async () => {
      await hook.result.startLoan('prep', '1', 5);
    });

    expect(hook.result.loanProcessError).toBe('User canceled the request');
    expect(hook.result.loanTxId).toBeNull();
    expect(submitLiquidiumBorrow).not.toHaveBeenCalled();
    expect(hook.result.isPreparing).toBe(false);
    expect(hook.result.isSigning).toBe(false);
    expect(hook.result.isSubmitting).toBe(false);
  });

  it('handles submit failure', async () => {
    (prepareLiquidiumBorrow as jest.Mock).mockResolvedValue({
      success: true,
      data: { base64_psbt: 'psbt', prepare_offer_id: 'prep', sides: [] },
    });
    (submitLiquidiumBorrow as jest.Mock).mockResolvedValue({
      success: false,
      error: 'submit failed',
    });

    const hook = renderHook(baseProps());

    await act(async () => {
      await hook.result.startLoan('prep', '1', 5);
    });

    expect(hook.result.loanProcessError).toBe('submit failed');
    expect(hook.result.loanTxId).toBeNull();
    expect(hook.result.isPreparing).toBe(false);
    expect(hook.result.isSigning).toBe(false);
    expect(hook.result.isSubmitting).toBe(false);
  });
});
