import { useReducer, useEffect } from "react";
import { SwapStep } from "./SwapButton";

export type SwapProcessState = {
  isSwapping: boolean;
  swapStep: SwapStep;
  swapError: string | null;
  txId: string | null;
  quoteExpired: boolean;
  isQuoteLoading: boolean;
  quoteError: string | null;
};

export type SwapProcessAction =
  | { type: "RESET_SWAP" }
  | { type: "FETCH_QUOTE_START" }
  | { type: "FETCH_QUOTE_SUCCESS" }
  | { type: "FETCH_QUOTE_ERROR"; error: string }
  | { type: "QUOTE_EXPIRED" }
  | { type: "SWAP_START" }
  | { type: "SWAP_STEP"; step: SwapProcessState["swapStep"] }
  | { type: "SWAP_ERROR"; error: string }
  | { type: "SWAP_SUCCESS"; txId: string }
  | { type: "SET_GENERIC_ERROR"; error: string };

export const initialSwapProcessState: SwapProcessState = {
  isSwapping: false,
  swapStep: "idle",
  swapError: null,
  txId: null,
  quoteExpired: false,
  isQuoteLoading: false,
  quoteError: null,
};

export function swapProcessReducer(
  state: SwapProcessState,
  action: SwapProcessAction,
): SwapProcessState {
  console.log(`SwapProcess: ${action.type}`, action);
  // Add some additional context about the current state for better debugging
  if (action.type !== "RESET_SWAP") {
    console.log(
      `Current swap state before action: isSwapping=${state.isSwapping}, swapStep=${state.swapStep}, quoteExpired=${state.quoteExpired}, isQuoteLoading=${state.isQuoteLoading}`,
    );
  }
  switch (action.type) {
    case "RESET_SWAP":
      return { ...initialSwapProcessState };
    case "FETCH_QUOTE_START":
      return {
        ...state,
        isQuoteLoading: true,
        quoteError: null,
        quoteExpired: false,
        swapStep: "fetching_quote",
      };
    case "FETCH_QUOTE_SUCCESS":
      return {
        ...state,
        isQuoteLoading: false,
        quoteError: null,
        quoteExpired: false,
        swapStep: "quote_ready",
      };
    case "FETCH_QUOTE_ERROR":
      return {
        ...state,
        isQuoteLoading: false,
        quoteError: action.error,
        swapStep: "idle",
      };
    case "QUOTE_EXPIRED":
      return {
        ...state,
        quoteExpired: true,
        swapStep: "idle",
        isSwapping: false,
      };
    case "SWAP_START":
      return {
        ...state,
        isSwapping: true,
        swapError: null,
        txId: null,
        quoteExpired: false,
      };
    case "SWAP_STEP":
      // When explicitly setting to idle, also clear the loading state
      if (action.step === "idle") {
        return {
          ...state,
          swapStep: action.step,
          isQuoteLoading: false, // Clear loading state when going to idle
          isSwapping: false, // Also ensure swap is not in progress
        };
      }
      return { ...state, swapStep: action.step };
    case "SWAP_ERROR":
      return {
        ...state,
        isSwapping: false,
        isQuoteLoading: false, // Ensure loading state is cleared
        swapError: action.error,
        swapStep: "error",
      };
    case "SWAP_SUCCESS":
      console.log("Setting swap state to SUCCESS with txId:", action.txId);
      return {
        ...state,
        isSwapping: false,
        swapStep: "success",
        txId: action.txId,
      };
    case "SET_GENERIC_ERROR":
      return { ...state, swapError: action.error };
    default:
      return state;
  }
}

interface UseSwapProcessManagerProps {
  /**
   * Whether the wallet is connected
   */
  connected: boolean;

  /**
   * Wallet address
   */
  address: string | null;
}

/**
 * Hook to manage the swap process state
 */
export function useSwapProcessManager({
  connected,
  address,
}: UseSwapProcessManagerProps) {
  const [swapState, dispatchSwap] = useReducer(
    swapProcessReducer,
    initialSwapProcessState,
  );

  // Reset swap state when inputs/wallet change significantly
  useEffect(() => {
    dispatchSwap({ type: "RESET_SWAP" });
  }, [address, connected]);

  // Special handling for successful swaps - ensure the success state persists
  useEffect(() => {
    if (swapState.swapStep === "success" && swapState.txId) {
      console.log("Swap success state detected, ensuring it persists");
      // This is a successful swap - we want to ensure the UI shows this
      // The success state should persist until the user manually resets (e.g., by starting a new swap)
    }
  }, [swapState.swapStep, swapState.txId]);

  return { swapState, dispatchSwap };
}

export default useSwapProcessManager;
