import React from 'react';
import { type QuoteResponse } from 'satsterminal-sdk';
import { Asset } from '@/types/common';
import styles from './SwapButton.module.css';

export type SwapStep =
  | 'idle'
  | 'fetching_quote'
  | 'quote_ready'
  | 'getting_psbt'
  | 'signing'
  | 'confirming'
  | 'success'
  | 'error';

interface SwapButtonProps {
  /**
   * Whether the user's wallet is connected
   */
  connected: boolean;

  /**
   * The input asset in the swap
   */
  assetIn: Asset | null;

  /**
   * The output asset in the swap
   */
  assetOut: Asset | null;

  /**
   * The amount the user entered to swap
   */
  inputAmount: string;

  /**
   * Whether a quote is being loaded
   */
  isQuoteLoading: boolean;

  /**
   * Whether a swap is being processed
   */
  isSwapping: boolean;

  /**
   * Error message if quote fetching failed
   */
  quoteError: string | null;

  /**
   * The current quote response
   */
  quote: QuoteResponse | null;

  /**
   * Whether the current quote has expired
   */
  quoteExpired: boolean;

  /**
   * Current step in the swap process
   */
  swapStep: SwapStep;

  /**
   * Transaction ID if swap was successful
   */
  txId: string | null;

  /**
   * Animation dots for loading states
   */
  loadingDots: string;

  /**
   * Function to fetch a new quote
   */
  onFetchQuote: () => void;

  /**
   * Function to execute the swap
   */
  onSwap: () => void;
}

/**
 * Button component for executing swaps with dynamic text based on swap state
 */
export const SwapButton: React.FC<SwapButtonProps> = ({
  connected,
  assetIn,
  assetOut,
  inputAmount,
  isQuoteLoading,
  isSwapping,
  quoteError,
  quote,
  quoteExpired,
  swapStep,
  txId,
  loadingDots,
  onFetchQuote,
  onSwap,
}) => {
  // Get appropriate button text based on current state
  const getSwapButtonText = () => {
    // Always show success message if we have a transaction ID, regardless of other state
    if (txId) return 'Swap Successful!';

    if (quoteExpired) return 'Fetch New Quote'; // Check first
    if (!connected) return 'Connect Wallet';
    if (isQuoteLoading) return `Fetching Quote${loadingDots}`;
    if (!assetIn || !assetOut) return 'Select Assets';
    if (!inputAmount || parseFloat(inputAmount) <= 0) return 'Enter Amount';
    // Special case for user cancellation - allow immediate retry
    if (quoteError?.includes('User canceled')) return 'Swap';

    // If quote expired, we already returned. If quoteError exists BUT it wasn't expiry or cancellation, show error.
    if (quoteError && !quoteExpired) return 'Quote Error';
    // Show loading quote only if not expired and amount > 0
    if (!quote && !quoteError && !quoteExpired && parseFloat(inputAmount) > 0)
      return `Getting Quote${loadingDots}`;
    if (!quote && !quoteExpired) return 'Get Quote'; // Before debounce or if amount is 0
    if (isSwapping) {
      // isSwapping is false if quoteExpired is true due to finally block logic
      switch (swapStep) {
        case 'getting_psbt':
          return `Generating Transaction${loadingDots}`;
        case 'signing':
          return `Waiting for Signature${loadingDots}`;
        case 'confirming':
          return `Confirming Swap${loadingDots}`;
        default:
          return `Processing Swap${loadingDots}`;
      }
    }
    if (swapStep === 'success') return 'Swap Successful!';
    // Show 'Swap Failed' only if it's an error state AND not a quote expiry requiring action
    if (swapStep === 'error' && !quoteExpired) return 'Swap Failed';
    // If idle after cancellation, show Swap. If idle after quote expiry, show Fetch New Quote (handled above)
    return 'Swap';
  };

  // Determine if the error is a user cancelation
  const isUserCanceled = quoteError?.includes('User canceled');

  // Determine when button should be disabled
  const isDisabled =
    !!txId || // Always disable if we have a txId (successful swap)
    (quoteExpired && isQuoteLoading && !isUserCanceled) || // Allow action even if loading if it's a user cancel
    (!quoteExpired &&
      (!connected ||
        !inputAmount ||
        parseFloat(inputAmount) <= 0 ||
        !assetIn ||
        !assetOut ||
        // CRITICAL FIX: Allow button to be enabled even during loading if it's a user cancellation
        (isQuoteLoading && !isUserCanceled) ||
        // Special case: allow button to be enabled for quote errors IF it's a user cancellation
        // This ensures the button becomes clickable again immediately after cancellation
        (!!quoteError && !isUserCanceled) ||
        // But still require a quote for non-canceled cases
        (!quote && !isUserCanceled) ||
        // Never disable due to isSwapping if it's a user cancelation
        (isSwapping && !isUserCanceled) ||
        swapStep === 'success' ||
        // Allow button to be enabled for error states if it's a user cancellation
        (swapStep === 'error' && !quoteExpired && !isUserCanceled)));

  // Determine the appropriate click handler
  const handleClick = () => {
    if (quoteExpired) {
      return onFetchQuote();
    }

    // Special case for user cancellation - treat it like a new fetch
    if (isUserCanceled) {
      return onFetchQuote();
    }

    // Otherwise proceed with normal swap
    return onSwap();
  };

  return (
    <button
      className={styles.swapButton}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {getSwapButtonText()}
    </button>
  );
};

export default SwapButton;
