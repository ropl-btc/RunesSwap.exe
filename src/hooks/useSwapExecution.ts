import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  type ConfirmPSBTParams,
  type GetPSBTParams,
  type Order,
  type QuoteResponse,
} from 'satsterminal-sdk';
import type {
  SwapProcessAction,
  SwapProcessState,
} from '@/components/swap/SwapProcessManager';
import {
  QUERY_KEYS,
  confirmPsbtViaApi,
  fetchRecommendedFeeRates,
  getPsbtFromApi,
} from '@/lib/api';
import { Asset } from '@/types/common';
import type {
  PsbtConfirmationResult,
  PsbtCreationResult,
} from '@/types/satsTerminal';
import { patchOrder } from '@/utils/orderUtils';

interface UseSwapExecutionArgs {
  connected: boolean;
  address: string | null;
  paymentAddress: string | null;
  publicKey: string | null;
  paymentPublicKey: string | null;
  signPsbt: (
    tx: string,
    finalize?: boolean,
    broadcast?: boolean,
  ) => Promise<
    | {
        signedPsbtHex: string | undefined;
        signedPsbtBase64: string | undefined;
      }
    | undefined
  >;
  assetIn: Asset | null;
  assetOut: Asset | null;
  quote: QuoteResponse | null;
  quoteTimestamp: number | null;
  swapState: SwapProcessState;
  dispatchSwap: React.Dispatch<SwapProcessAction>;
  isThrottledRef: React.MutableRefObject<boolean>;
  quoteKeyRef: React.MutableRefObject<string>;
  selectedFeeRate?: number;
}

export default function useSwapExecution({
  connected,
  address,
  paymentAddress,
  publicKey,
  paymentPublicKey,
  signPsbt,
  assetIn,
  assetOut,
  quote,
  quoteTimestamp,
  swapState,
  dispatchSwap,
  isThrottledRef,
  quoteKeyRef,
  selectedFeeRate,
}: UseSwapExecutionArgs) {
  const errorMessageRef = useRef<string | null>(null);

  const { data: recommendedFeeRates } = useQuery({
    queryKey: [QUERY_KEYS.BTC_FEE_RATES],
    queryFn: fetchRecommendedFeeRates,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleSwap = async () => {
    // Initialize the swap process
    const isBtcToRune = assetIn?.isBTC;
    const runeAsset = isBtcToRune ? assetOut : assetIn;

    // Double-check required data
    if (
      !connected ||
      !address ||
      !publicKey ||
      !paymentAddress ||
      !paymentPublicKey ||
      !quote ||
      !assetIn ||
      !assetOut ||
      !runeAsset ||
      runeAsset.isBTC
    ) {
      dispatchSwap({
        type: 'SET_GENERIC_ERROR',
        error:
          'Missing connection details, assets, or quote. Please connect wallet and ensure quote is fetched.',
      });
      dispatchSwap({
        type: 'SWAP_ERROR',
        error:
          'Missing connection details, assets, or quote. Please connect wallet and ensure quote is fetched.',
      });
      return;
    }

    if (!quoteTimestamp || Date.now() - quoteTimestamp > 60000) {
      dispatchSwap({ type: 'QUOTE_EXPIRED' });
      dispatchSwap({
        type: 'SET_GENERIC_ERROR',
        error: 'Quote expired. Please fetch a new one.',
      });
      return;
    }

    // Proceed with the swap process - only dispatch SWAP_START, not FETCH_QUOTE_START
    // This prevents duplicate loading states that can cause button to remain disabled on cancellation
    dispatchSwap({ type: 'SWAP_START' });

    try {
      // 1. Get PSBT via API
      dispatchSwap({ type: 'SWAP_STEP', step: 'getting_psbt' });
      // Patch orders: ensure numeric fields are numbers and side is uppercase if present
      const orders: Order[] = (quote.selectedOrders || []).map(patchOrder);

      // Get the optimal fee rate from the mempool.space API, falling back to defaults
      // Use appropriate fee rate based on transaction type (higher for selling runes)
      const optimalFeeRate =
        selectedFeeRate && selectedFeeRate > 0
          ? selectedFeeRate
          : recommendedFeeRates
            ? !isBtcToRune
              ? recommendedFeeRates.fastestFee
              : recommendedFeeRates.halfHourFee
            : 15;

      const psbtParams: GetPSBTParams = {
        orders: orders,
        address: address,
        publicKey: publicKey,
        paymentAddress: paymentAddress,
        paymentPublicKey: paymentPublicKey,
        runeName: runeAsset.name,
        sell: !isBtcToRune,
        feeRate: optimalFeeRate, // Dynamic fee rate based on current network conditions
      };

      // *** Use API client function ***
      try {
        const psbtResult: PsbtCreationResult = await getPsbtFromApi(psbtParams);

        const mainPsbtBase64 = psbtResult.psbtBase64 ?? psbtResult.psbt;
        const swapId = psbtResult.swapId;
        const rbfPsbtBase64 = psbtResult.rbfProtected?.base64;

        if (!mainPsbtBase64 || !swapId) {
          throw new Error(
            `Invalid PSBT data received from API: ${JSON.stringify(psbtResult)}`,
          );
        }

        // 2. Sign PSBT(s) - Remains client-side via LaserEyes
        dispatchSwap({ type: 'SWAP_STEP', step: 'signing' });
        const mainSigningResult = await signPsbt(mainPsbtBase64);
        const signedMainPsbt = mainSigningResult?.signedPsbtBase64;
        if (!signedMainPsbt) {
          throw new Error('Main PSBT signing cancelled or failed.');
        }

        let signedRbfPsbt: string | null = null;
        if (rbfPsbtBase64) {
          const rbfSigningResult = await signPsbt(rbfPsbtBase64);
          signedRbfPsbt = rbfSigningResult?.signedPsbtBase64 ?? null;
          if (!signedRbfPsbt) {
          }
        }

        // 3. Confirm PSBT via API
        dispatchSwap({ type: 'SWAP_STEP', step: 'confirming' });
        const confirmParams: ConfirmPSBTParams = {
          orders: orders,
          address: address,
          publicKey: publicKey,
          paymentAddress: paymentAddress,
          paymentPublicKey: paymentPublicKey,
          signedPsbtBase64: signedMainPsbt,
          swapId: swapId,
          runeName: runeAsset.name,
          sell: !isBtcToRune,
          rbfProtection: !!signedRbfPsbt,
          ...(signedRbfPsbt && { signedRbfPsbtBase64: signedRbfPsbt }),
        };
        // *** Use API client function ***
        const confirmResult: PsbtConfirmationResult =
          await confirmPsbtViaApi(confirmParams);

        const finalTxId =
          confirmResult.txid ||
          confirmResult.rbfProtection?.fundsPreparationTxId;
        if (!finalTxId) {
          throw new Error(
            `Confirmation failed or transaction ID missing. Response: ${JSON.stringify(confirmResult)}`,
          );
        }
        dispatchSwap({ type: 'SWAP_SUCCESS', txId: finalTxId });

        // Prevent further operations
        isThrottledRef.current = true;

        // This is important to prevent further fetches
        setTimeout(() => {
          // Do this in next tick to ensure state is updated
          quoteKeyRef.current = 'completed-swap';
        }, 0);
      } catch (psbtError) {
        // Re-throw to be caught by the outer catch block
        throw psbtError;
      }
    } catch (error: unknown) {
      // Extract error message for better error handling
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unknown error occurred during the swap.';

      // Store the error message for use in the finally block
      errorMessageRef.current = errorMessage;

      // Handle fee rate errors specifically
      if (
        errorMessage.includes('Network fee rate not high enough') ||
        errorMessage.includes('fee rate')
      ) {
        // First, notify the user that we're retrying
        dispatchSwap({
          type: 'SET_GENERIC_ERROR',
          error:
            'Fee rate too low, automatically retrying with a higher fee rate...',
        });

        try {
          // Calculate a higher fee rate for the retry (use fastestFee + 30% extra)
          // If recommendedFeeRates is not available, use a fixed high value
          const highPriorityFeeRate = recommendedFeeRates
            ? Math.ceil(recommendedFeeRates.fastestFee * 1.3) // 30% more than fastest
            : 35; // fallback high value

          const orders: Order[] = (quote.selectedOrders || []).map(patchOrder);

          const retryParams: GetPSBTParams = {
            orders,
            address,
            publicKey,
            paymentAddress,
            paymentPublicKey,
            runeName: runeAsset.name,
            sell: !isBtcToRune,
            feeRate: highPriorityFeeRate,
          };

          // Removed redundant log as we already logged the fee rate
          const psbtResult: PsbtCreationResult =
            await getPsbtFromApi(retryParams);

          const mainPsbtBase64 = psbtResult.psbtBase64 ?? psbtResult.psbt;
          const swapId = psbtResult.swapId;
          const rbfPsbtBase64 = psbtResult.rbfProtected?.base64;

          if (!mainPsbtBase64 || !swapId) {
            throw new Error(
              `Invalid PSBT data received from API: ${JSON.stringify(psbtResult)}`,
            );
          }

          // Continue with the original flow using the new PSBT
          // 👍 Successfully created PSBT with higher fee rate, continue with standard flow
          dispatchSwap({ type: 'SWAP_STEP', step: 'signing' });
          const mainSigningResult = await signPsbt(mainPsbtBase64);
          const signedMainPsbt = mainSigningResult?.signedPsbtBase64;
          if (!signedMainPsbt) {
            throw new Error('Main PSBT signing cancelled or failed.');
          }

          let signedRbfPsbt: string | null = null;
          if (rbfPsbtBase64) {
            const rbfSigningResult = await signPsbt(rbfPsbtBase64);
            signedRbfPsbt = rbfSigningResult?.signedPsbtBase64 ?? null;
          }

          // 3. Confirm PSBT via API with higher fee rate PSBT
          // Confirming the PSBT with higher fee
          dispatchSwap({ type: 'SWAP_STEP', step: 'confirming' });
          const confirmParams: ConfirmPSBTParams = {
            orders: orders,
            address: address,
            publicKey: publicKey,
            paymentAddress: paymentAddress,
            paymentPublicKey: paymentPublicKey,
            signedPsbtBase64: signedMainPsbt,
            swapId: swapId,
            runeName: runeAsset.name,
            sell: !isBtcToRune,
            rbfProtection: !!signedRbfPsbt,
            ...(signedRbfPsbt && { signedRbfPsbtBase64: signedRbfPsbt }),
          };

          // Confirm with the new PSBT
          const confirmResult: PsbtConfirmationResult =
            await confirmPsbtViaApi(confirmParams);

          const finalTxId =
            confirmResult.txid ||
            confirmResult.rbfProtection?.fundsPreparationTxId;
          if (!finalTxId) {
            throw new Error(
              `Confirmation failed or transaction ID missing. Response: ${JSON.stringify(confirmResult)}`,
            );
          }

          dispatchSwap({ type: 'SWAP_SUCCESS', txId: finalTxId });

          // Prevent further operations
          isThrottledRef.current = true;

          // This is important to prevent further fetches
          setTimeout(() => {
            // Do this in next tick to ensure state is updated
            quoteKeyRef.current = 'completed-swap';
          }, 0);

          // Exit the catch block - we've successfully recovered from the error
          return;
        } catch (retryError) {
          // If the retry also fails, show a more specific error
          console.error('Transaction failed even with higher fee rate');
          const retryErrorMessage =
            retryError instanceof Error
              ? retryError.message
              : 'Failed to retry with higher fee rate';

          dispatchSwap({
            type: 'SET_GENERIC_ERROR',
            error: `Transaction failed even with a higher fee rate. The network may be congested. Please try again later. (${retryErrorMessage})`,
          });
          dispatchSwap({
            type: 'SWAP_ERROR',
            error: `Transaction failed even with a higher fee rate. The network may be congested. Please try again later. (${retryErrorMessage})`,
          });
        }
      }
      // Handle other specific errors
      else if (
        errorMessage.includes('Quote expired. Please, fetch again.') ||
        (error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as { code?: string }).code === 'QUOTE_EXPIRED')
      ) {
        // Quote expired error
        dispatchSwap({ type: 'QUOTE_EXPIRED' });
        dispatchSwap({
          type: 'SET_GENERIC_ERROR',
          error: 'Quote expired. Please fetch a new one.',
        });
        dispatchSwap({
          type: 'SWAP_ERROR',
          error: 'Quote expired. Please fetch a new one.',
        });
      } else if (
        errorMessage.includes('User canceled the request') ||
        errorMessage.includes('User canceled')
      ) {
        // User cancelled signing - reset state completely

        // IMPORTANT: We use a full reset instead of individual state updates
        // This ensures we clear ALL state flags at once, including isQuoteLoading
        dispatchSwap({ type: 'RESET_SWAP' });

        // Explicitly set the swap step to idle as well to ensure the UI is reset correctly
        // This handles edge cases where RESET_SWAP might not fully propagate immediately
        dispatchSwap({ type: 'SWAP_STEP', step: 'idle' });

        // Then set the error message for the user (after reset)
        dispatchSwap({
          type: 'SET_GENERIC_ERROR',
          error: 'User canceled the request',
        });
      } else {
        // Other swap errors
        dispatchSwap({ type: 'SET_GENERIC_ERROR', error: errorMessage });
        dispatchSwap({ type: 'SWAP_ERROR', error: errorMessage });
      }
    } finally {
      // If we have a transaction ID, ensure success state persists
      if (swapState.txId) {
        if (swapState.swapStep !== 'success') {
          dispatchSwap({ type: 'SWAP_SUCCESS', txId: swapState.txId });
        }
        return;
      }

      // ======================================================================
      // CRITICAL ERROR HANDLING FIX
      // This section preserves error states in the UI for the user to see
      // DO NOT REMOVE THE EARLY RETURN or error messages will disappear immediately
      // ======================================================================
      if (errorMessageRef.current) {
        // Special case for user cancelation - reset back to idle
        if (errorMessageRef.current.includes('User canceled')) {
          dispatchSwap({ type: 'SWAP_STEP', step: 'idle' });
        } else {
          // IMPORTANT: Do nothing for non-cancelation errors to preserve the error UI
          // Future improvement: We could add error categorization here for better UX
          // e.g., network errors, fee errors, liquidity errors with specific messages
        }
        return; // <-- CRITICAL: This early return prevents the error state from being reset
      }

      // Handle non-success states with no errors
      if (swapState.swapStep !== 'success') {
        dispatchSwap({ type: 'SWAP_STEP', step: 'idle' });
      }
    }
  };

  return { handleSwap };
}
