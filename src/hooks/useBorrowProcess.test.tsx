import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import type { RuneData } from '@/lib/runesData';
import { useBorrowProcess } from './useBorrowProcess';

// Mock the API functions
jest.mock('@/lib/api', () => ({
  prepareLiquidiumBorrow: jest.fn(),
  submitLiquidiumBorrow: jest.fn(),
}));

const { prepareLiquidiumBorrow, submitLiquidiumBorrow } =
  jest.requireMock('@/lib/api');

// Setup DOM environment for React testing
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

// Type definitions for hook parameters
type HookProps = Parameters<typeof useBorrowProcess>[0];

// Helper function to render the hook in a test component
function renderHook(props: HookProps) {
  let result: ReturnType<typeof useBorrowProcess> | undefined;
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
      if (!result) {
        throw new Error('Hook not initialized - ensure component has rendered');
      }
      return result;
    },
    rerender(newProps: HookProps) {
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

// Helper function to create base props with defaults
function baseProps(overrides: Partial<HookProps> = {}): HookProps {
  const mockRuneData: RuneData = {
    id: 'test-rune-id',
    name: 'TEST_RUNE',
    formatted_name: 'Test Rune',
    spacers: 0,
    number: 123,
    inscription_id: 'test-inscription-id',
    decimals: 8,
    mint_count_cap: '1000000',
    symbol: 'TR',
    etching_txid: 'test-etching-txid',
    amount_per_mint: '1000',
    timestamp_unix: '1640995200',
    premined_supply: '500000',
    mint_start_block: 800000,
    mint_end_block: 900000,
    current_supply: '750000',
    current_mint_count: 750,
  };

  return {
    signPsbt: jest.fn().mockResolvedValue({
      signedPsbtHex: 'signed-hex',
      signedPsbtBase64: 'signed-base64',
    }),
    address: 'test-ordinal-address',
    paymentAddress: 'test-payment-address',
    publicKey: 'test-public-key',
    paymentPublicKey: 'test-payment-public-key',
    collateralRuneInfo: mockRuneData,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useBorrowProcess', () => {
  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const props = baseProps();
      const hook = renderHook(props);

      expect(hook.result.isPreparing).toBe(false);
      expect(hook.result.isSigning).toBe(false);
      expect(hook.result.isSubmitting).toBe(false);
      expect(hook.result.loanProcessError).toBe(null);
      expect(hook.result.loanTxId).toBe(null);
      expect(typeof hook.result.startLoan).toBe('function');
      expect(typeof hook.result.reset).toBe('function');

      hook.unmount();
    });
  });

  describe('startLoan validation', () => {
    it('should set error for missing quote ID', async () => {
      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan(null, '100', 5);
      });

      expect(hook.result.loanProcessError).toBe(
        'Missing required information (quote or amount).',
      );
      expect(prepareLiquidiumBorrow).not.toHaveBeenCalled();

      hook.unmount();
    });

    it('should set error for empty collateral amount', async () => {
      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '  ', 5);
      });

      expect(hook.result.loanProcessError).toBe(
        'Missing required information (quote or amount).',
      );
      expect(prepareLiquidiumBorrow).not.toHaveBeenCalled();

      hook.unmount();
    });

    it('should set error for invalid collateral amount (NaN)', async () => {
      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', 'invalid-number', 5);
      });

      expect(hook.result.loanProcessError).toBe(
        'Missing required information (quote or amount).',
      );
      expect(prepareLiquidiumBorrow).not.toHaveBeenCalled();

      hook.unmount();
    });

    it('should set error for zero or negative collateral amount', async () => {
      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '0', 5);
      });

      expect(hook.result.loanProcessError).toBe(
        'Missing required information (quote or amount).',
      );
      expect(prepareLiquidiumBorrow).not.toHaveBeenCalled();

      hook.unmount();
    });
  });

  describe('successful loan flow', () => {
    it('should complete full loan process successfully', async () => {
      // Mock successful API responses
      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt-base64',
          prepare_offer_id: 'prepare-offer-123',
        },
      });

      submitLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          loan_transaction_id: 'loan-tx-123',
        },
      });

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100.5', 10);
      });

      // Verify the loan completed successfully
      expect(hook.result.loanTxId).toBe('loan-tx-123');
      expect(hook.result.loanProcessError).toBe(null);
      expect(hook.result.isPreparing).toBe(false);
      expect(hook.result.isSigning).toBe(false);
      expect(hook.result.isSubmitting).toBe(false);

      // Verify API calls were made with correct parameters
      expect(prepareLiquidiumBorrow).toHaveBeenCalledWith({
        instant_offer_id: 'quote-123',
        fee_rate: 10,
        token_amount: '10050000000', // 100.5 * 10^8 for 8 decimals
        borrower_payment_address: 'test-payment-address',
        borrower_payment_pubkey: 'test-payment-public-key',
        borrower_ordinal_address: 'test-ordinal-address',
        borrower_ordinal_pubkey: 'test-public-key',
        address: 'test-ordinal-address',
      });

      expect(props.signPsbt).toHaveBeenCalledWith('test-psbt-base64');

      expect(submitLiquidiumBorrow).toHaveBeenCalledWith({
        signed_psbt_base_64: 'signed-base64',
        prepare_offer_id: 'prepare-offer-123',
        address: 'test-ordinal-address',
      });

      hook.unmount();
    });

    it('should handle different decimal places correctly', async () => {
      // Test with 0 decimals
      const runeDataNoDecimals: RuneData = {
        ...baseProps().collateralRuneInfo!,
        decimals: 0,
      };

      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      submitLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: { loan_transaction_id: 'tx-123' },
      });

      const props = baseProps({ collateralRuneInfo: runeDataNoDecimals });
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '150', 5);
      });

      expect(prepareLiquidiumBorrow).toHaveBeenCalledWith(
        expect.objectContaining({
          token_amount: '150', // No decimal scaling for 0 decimals
        }),
      );

      hook.unmount();
    });

    it('should handle high decimal places correctly', async () => {
      // Test with 18 decimals (higher than 8)
      const runeDataHighDecimals: RuneData = {
        ...baseProps().collateralRuneInfo!,
        decimals: 18,
      };

      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      submitLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: { loan_transaction_id: 'tx-123' },
      });

      const props = baseProps({ collateralRuneInfo: runeDataHighDecimals });
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '1.5', 5);
      });

      // 1.5 * 10^18 = 1500000000000000000
      expect(prepareLiquidiumBorrow).toHaveBeenCalledWith(
        expect.objectContaining({
          token_amount: '1500000000000000000',
        }),
      );

      hook.unmount();
    });
  });

  describe('error handling', () => {
    it('should handle prepare borrow API failure', async () => {
      prepareLiquidiumBorrow.mockResolvedValue({
        success: false,
        error: 'Insufficient collateral',
      });

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      expect(hook.result.loanProcessError).toBe('Insufficient collateral');
      expect(hook.result.loanTxId).toBe(null);
      expect(hook.result.isPreparing).toBe(false);
      expect(hook.result.isSigning).toBe(false);
      expect(hook.result.isSubmitting).toBe(false);

      hook.unmount();
    });

    it('should handle missing prepare response data', async () => {
      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: null,
      });

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      expect(hook.result.loanProcessError).toBe(
        'Failed to prepare loan transaction.',
      );

      hook.unmount();
    });

    it('should handle user canceling PSBT signing', async () => {
      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      const props = baseProps({
        signPsbt: jest.fn().mockResolvedValue(undefined),
      });
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      expect(hook.result.loanProcessError).toBe('User canceled the request');
      expect(hook.result.loanTxId).toBe(null);

      hook.unmount();
    });

    it('should handle PSBT signing returning no base64', async () => {
      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      const props = baseProps({
        signPsbt: jest.fn().mockResolvedValue({
          signedPsbtHex: 'hex-data',
          signedPsbtBase64: undefined,
        }),
      });
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      expect(hook.result.loanProcessError).toBe('User canceled the request');

      hook.unmount();
    });

    it('should handle submit borrow API failure', async () => {
      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      submitLiquidiumBorrow.mockResolvedValue({
        success: false,
        error: 'Network error during submission',
      });

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      expect(hook.result.loanProcessError).toBe(
        'Network error during submission',
      );
      expect(hook.result.loanTxId).toBe(null);

      hook.unmount();
    });

    it('should handle network errors during API calls', async () => {
      prepareLiquidiumBorrow.mockRejectedValue(
        new Error('Network connection failed'),
      );

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      expect(hook.result.loanProcessError).toBe('Network connection failed');

      hook.unmount();
    });

    it('should handle unexpected errors with fallback message', async () => {
      prepareLiquidiumBorrow.mockRejectedValue('Unexpected error type');

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      expect(hook.result.loanProcessError).toBe('Failed to start loan.');

      hook.unmount();
    });
  });

  describe('state transitions', () => {
    it('should show correct loading states during loan process', async () => {
      // Mock successful API responses with immediate resolution
      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      submitLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: { loan_transaction_id: 'tx-123' },
      });

      const props = baseProps();
      const hook = renderHook(props);

      // Initial state should be idle
      expect(hook.result.isPreparing).toBe(false);
      expect(hook.result.isSigning).toBe(false);
      expect(hook.result.isSubmitting).toBe(false);

      // Complete the loan process
      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      // After completion, should be back to idle state with success
      expect(hook.result.isPreparing).toBe(false);
      expect(hook.result.isSigning).toBe(false);
      expect(hook.result.isSubmitting).toBe(false);
      expect(hook.result.loanTxId).toBe('tx-123');
      expect(hook.result.loanProcessError).toBe(null);

      hook.unmount();
    });
  });

  describe('reset functionality', () => {
    it('should reset loan state and errors', async () => {
      // First, create an error state
      prepareLiquidiumBorrow.mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      // Verify error state
      expect(hook.result.loanProcessError).toBe('Test error');

      // Now reset
      act(() => {
        hook.result.reset();
      });

      // Verify reset state
      expect(hook.result.loanProcessError).toBe(null);
      expect(hook.result.loanTxId).toBe(null);

      hook.unmount();
    });

    it('should reset successful loan state', async () => {
      // First, complete a successful loan
      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      submitLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: { loan_transaction_id: 'tx-123' },
      });

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      // Verify successful state
      expect(hook.result.loanTxId).toBe('tx-123');

      // Now reset
      act(() => {
        hook.result.reset();
      });

      // Verify reset state
      expect(hook.result.loanTxId).toBe(null);
      expect(hook.result.loanProcessError).toBe(null);

      hook.unmount();
    });
  });

  describe('edge cases', () => {
    it('should handle null collateralRuneInfo', async () => {
      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      submitLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: { loan_transaction_id: 'tx-123' },
      });

      const props = baseProps({ collateralRuneInfo: null });
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100', 5);
      });

      // Should use 0 decimals as fallback
      expect(prepareLiquidiumBorrow).toHaveBeenCalledWith(
        expect.objectContaining({
          token_amount: '100', // No decimal scaling
        }),
      );

      hook.unmount();
    });

    it('should handle decimal conversion errors gracefully', async () => {
      // Mock BigInt operations to throw (simulating very large numbers)
      const originalBigInt = global.BigInt;
      (global as { BigInt: unknown }).BigInt = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('BigInt conversion failed');
        });

      prepareLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: {
          base64_psbt: 'test-psbt',
          prepare_offer_id: 'prepare-123',
        },
      });

      submitLiquidiumBorrow.mockResolvedValue({
        success: true,
        data: { loan_transaction_id: 'tx-123' },
      });

      const props = baseProps();
      const hook = renderHook(props);

      await act(async () => {
        await hook.result.startLoan('quote-123', '100.5', 5);
      });

      // Should fall back to simple multiplication
      expect(prepareLiquidiumBorrow).toHaveBeenCalledWith(
        expect.objectContaining({
          token_amount: '10050000000', // 100.5 * 10^8 using fallback method
        }),
      );

      // Restore original BigInt
      global.BigInt = originalBigInt;

      hook.unmount();
    });
  });
});
