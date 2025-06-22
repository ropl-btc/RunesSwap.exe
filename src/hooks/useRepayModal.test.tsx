import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { LiquidiumLoanOffer } from '@/types/liquidium';
import { useRepayModal } from './useRepayModal';

jest.mock('@/lib/api', () => ({
  repayLiquidiumLoan: jest.fn(),
  submitRepayPsbt: jest.fn(),
}));

const { repayLiquidiumLoan: mockRepay, submitRepayPsbt: mockSubmit } =
  jest.requireMock('@/lib/api');

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

function renderHook(props: Parameters<typeof useRepayModal>[0]) {
  let result: ReturnType<typeof useRepayModal>;
  function TestComponent(p: Parameters<typeof useRepayModal>[0]) {
    result = useRepayModal(p);
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
    rerender(newProps: Parameters<typeof useRepayModal>[0]) {
      act(() => {
        root.render(<TestComponent {...newProps} />);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
    },
  };
}

const loan: LiquidiumLoanOffer = {
  id: 'loan1',
  loan_details: {
    state: 'ACTIVE',
    principal_amount_sats: 50000000,
    loan_term_days: 30,
    loan_term_end_date: '2025-01-01',
    start_date: '2024-01-01',
    escrow_address: 'escrow',
    discount: { discount_rate: 0, discount_sats: 0 },
    total_repayment_sats: 55000000,
  },
  collateral_details: {
    rune_id: 'rune1',
    collateral_type: 'Rune',
    rune_divisibility: 8,
    rune_amount: 1,
  },
};

describe('useRepayModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles repayment flow successfully', async () => {
    mockRepay.mockResolvedValue({ success: true, data: { psbt: 'psbt' } });
    mockSubmit.mockResolvedValue({
      success: true,
      data: { repayment_transaction_id: 'txid' },
    });

    const signPsbt = jest
      .fn()
      .mockResolvedValue({ signedPsbtBase64: 'signed' });
    const hook = renderHook({ address: 'addr', signPsbt });

    await act(async () => {
      await hook.result.handleRepay(loan);
    });

    expect(hook.result.isRepayingLoanId).toBeNull();
    expect(hook.result.repayModal.open).toBe(true);
    expect(hook.result.repayModal.repayInfo?.psbt).toBe('psbt');
    expect(hook.result.repayModal.loading).toBe(false);
    expect(hook.result.repayModal.error).toBeNull();

    await act(async () => {
      await hook.result.handleRepayModalConfirm();
    });

    expect(signPsbt).toHaveBeenCalledWith('psbt', false, false);
    expect(mockSubmit).toHaveBeenCalledWith('loan1', 'signed', 'addr');
    expect(hook.result.repayModal.loading).toBe(false);
    expect(hook.result.repayModal.error).toBeNull();
    expect(hook.result.repayModal.open).toBe(false);
    hook.unmount();
  });
});
