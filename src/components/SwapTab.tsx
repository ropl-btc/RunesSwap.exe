import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./SwapTab.module.css";
import { useDebounce } from "use-debounce";
import { type QuoteResponse } from "satsterminal-sdk";
import { normalizeRuneName } from "@/utils/runeUtils";
import { Asset, BTC_ASSET } from "@/types/common";
import {
  fetchQuoteFromApi,
  fetchBtcBalanceFromApi,
  fetchRuneBalancesFromApi,
  fetchRuneInfoFromApi,
  fetchRuneMarketFromApi,
} from "@/lib/api";
import useSwapRunes from "@/hooks/useSwapRunes";
import {
  type RuneBalance as OrdiscanRuneBalance,
  type RuneMarketInfo as OrdiscanRuneMarketInfo,
} from "@/types/ordiscan";
import { type RuneData } from "@/lib/runesData";

// Import our new components
import { SwapTabForm, useSwapProcessManager } from "./swap";
import useSwapExecution from "@/hooks/useSwapExecution";
import useUsdValues from "@/hooks/useUsdValues";

// Mock address for fetching quotes when disconnected
const MOCK_ADDRESS = "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo";

interface SwapTabProps {
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
    | { signedPsbtHex?: string; signedPsbtBase64?: string; txId?: string }
    | undefined
  >;
  btcPriceUsd: number | undefined;
  isBtcPriceLoading: boolean;
  btcPriceError: Error | null;
  // New props for cached popular runes
  cachedPopularRunes?: Record<string, unknown>[];
  isPopularRunesLoading?: boolean;
  popularRunesError?: Error | null;
  // New props for price chart
  onShowPriceChart?: (assetName?: string, shouldToggle?: boolean) => void;
  showPriceChart?: boolean;
  preSelectedRune?: string | null;
}

export function SwapTab({
  connected,
  address,
  paymentAddress,
  publicKey,
  paymentPublicKey,
  signPsbt,
  btcPriceUsd,
  isBtcPriceLoading,
  btcPriceError,
  cachedPopularRunes = [],
  isPopularRunesLoading = false,
  popularRunesError = null,
  onShowPriceChart,
  showPriceChart = false,
  preSelectedRune = null,
}: SwapTabProps) {
  // State for input/output amounts
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");

  // State for selected assets
  const [assetIn, setAssetIn] = useState<Asset>(BTC_ASSET);
  const [assetOut, setAssetOut] = useState<Asset | null>(null);

  const {
    popularRunes,
    isPopularLoading,
    popularError,
    isPreselectedRuneLoading,
  } = useSwapRunes({
    cachedPopularRunes,
    isPopularRunesLoading,
    popularRunesError,
    preSelectedRune,
    assetOut,
    setAssetIn,
    setAssetOut,
  });

  const availableRunes = popularRunes;
  const isLoadingRunes = isPopularLoading;
  const currentRunesError = popularError;

  // Add back loadingDots state for animation
  const [loadingDots, setLoadingDots] = useState(".");
  // Add back quote, quoteError, quoteExpired for quote data and error
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteTimestamp, setQuoteTimestamp] = useState<number | null>(null);

  // --- Swap process state (reducer) ---
  const { swapState, dispatchSwap } = useSwapProcessManager({
    connected,
    address,
  });

  // Use reducer state for quoteError and quoteExpired
  const quoteError = swapState.quoteError;
  const quoteExpired = swapState.quoteExpired;

  // Track the latest quote request to avoid race conditions
  const latestQuoteRequestId = useRef(0);

  // State for calculated prices
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);

  // Ordiscan Balance Queries
  const {
    data: btcBalanceSats,
    isLoading: isBtcBalanceLoading,
    error: btcBalanceError,
  } = useQuery<number, Error>({
    queryKey: ["btcBalance", paymentAddress], // Include address in key
    queryFn: () => fetchBtcBalanceFromApi(paymentAddress!), // Use API function
    enabled: !!connected && !!paymentAddress, // Only run query if connected and address exists
    staleTime: 30000, // Consider balance stale after 30 seconds
  });

  const {
    data: runeBalances,
    isLoading: isRuneBalancesLoading,
    error: runeBalancesError,
  } = useQuery<OrdiscanRuneBalance[], Error>({
    queryKey: ["runeBalancesApi", address],
    queryFn: () => fetchRuneBalancesFromApi(address!), // Use API function
    enabled: !!connected && !!address, // Only run query if connected and address exists
    staleTime: 30000, // Consider balances stale after 30 seconds
  });

  // Query for Input Rune Info (needed for decimals and other info)
  const {
    data: swapRuneInfo,
    isLoading: isSwapRuneInfoLoading,
    error: swapRuneInfoError,
  } = useQuery<RuneData | null, Error>({
    queryKey: [
      "runeInfoApi",
      assetIn?.name ? normalizeRuneName(assetIn.name) : undefined,
    ],
    queryFn: () =>
      assetIn && !assetIn.isBTC && assetIn.name
        ? fetchRuneInfoFromApi(assetIn.name)
        : Promise.resolve(null), // Use API function
    enabled: !!assetIn && !assetIn.isBTC && !!assetIn.name, // Only fetch for non-BTC assets
    staleTime: Infinity,
  });

  // Query for Input Rune Market Info (for swap tab)
  const { data: inputRuneMarketInfo } = useQuery<
    OrdiscanRuneMarketInfo | null,
    Error
  >({
    queryKey: ["runeMarketApi", assetIn?.name],
    queryFn: () =>
      assetIn && !assetIn.isBTC
        ? fetchRuneMarketFromApi(assetIn.name)
        : Promise.resolve(null),
    enabled: !!assetIn && !assetIn.isBTC,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for Output Rune Market Info (for swap tab)
  const { data: outputRuneMarketInfo } = useQuery<
    OrdiscanRuneMarketInfo | null,
    Error
  >({
    queryKey: ["runeMarketApi", assetOut?.name],
    queryFn: () =>
      assetOut && !assetOut.isBTC
        ? fetchRuneMarketFromApi(assetOut.name)
        : Promise.resolve(null),
    enabled: !!assetOut && !assetOut.isBTC,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { inputUsdValue, outputUsdValue } = useUsdValues({
    inputAmount,
    outputAmount,
    assetIn,
    assetOut,
    btcPriceUsd,
    isBtcPriceLoading,
    btcPriceError,
    quote,
    quoteError,
    inputRuneMarketInfo,
    outputRuneMarketInfo,
  });

  // Effect for loading dots animation (with proper cycling animation)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isBtcPriceLoading || swapState.isQuoteLoading || swapState.isSwapping) {
      // Create animated dots that cycle through [.,..,...] pattern
      intervalId = setInterval(() => {
        setLoadingDots((dots) => {
          switch (dots) {
            case ".":
              return "..";
            case "..":
              return "...";
            default:
              return "."; // Reset to single dot
          }
        });
      }, 400); // Update every 400ms for smoother animation
    } else {
      setLoadingDots("."); // Reset when not loading
    }

    // Cleanup function to clear interval
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isBtcPriceLoading, swapState.isQuoteLoading, swapState.isSwapping]);

  // Search functionality handled by AssetSelector component

  // Define debounced value for input amount with a longer delay to reduce API calls
  // Correctly use the imported useDebounce hook - extract the first element
  const [debouncedInputAmount] = useDebounce(
    inputAmount ? parseFloat(inputAmount) : 0,
    1500, // Increased to 1500ms to reduce rapid fetching even more
  );

  // Use a throttle flag to prevent too-frequent fetches even with the debounce
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isThrottledRef = useRef(false);

  // Add a timestamp ref to prevent too-frequent RESET_SWAP actions
  const lastResetTimestampRef = useRef<number | null>(null);

  // --- Asset Selection Logic ---
  const handleSelectAssetIn = (selectedAsset: Asset) => {
    // If user tries to select the same asset that's already in the output,
    // swap the assets instead of blocking the selection
    if (assetOut && selectedAsset.id === assetOut.id) {
      handleSwapDirection();
      return;
    }

    setAssetIn(selectedAsset);
    // If selected asset is BTC, ensure output is a Rune
    if (selectedAsset.isBTC) {
      if (!assetOut || assetOut.isBTC) {
        // Set to first available rune or null if none
        const newAssetOut = popularRunes.length > 0 ? popularRunes[0] : null;
        setAssetOut(newAssetOut);
      }
    } else {
      // If selected asset is a Rune, ensure output is BTC
      setAssetOut(BTC_ASSET);
    }
    // Clear amounts and quote when assets change
    setOutputAmount("");
    setQuote(null);
    dispatchSwap({ type: "FETCH_QUOTE_ERROR", error: "" });
    setExchangeRate(null);
  };

  const handleSelectAssetOut = (selectedAsset: Asset) => {
    // If user tries to select the same asset that's already in the input,
    // swap the assets instead of blocking the selection
    if (assetIn && selectedAsset.id === assetIn.id) {
      handleSwapDirection();
      return;
    }

    const previousAssetIn = assetIn; // Store previous input asset

    setAssetOut(selectedAsset);

    // If the price chart is visible, update it with the new asset
    if (showPriceChart) {
      onShowPriceChart?.(selectedAsset.name, false);
    }

    // If the NEW output asset is BTC, ensure input is a Rune
    if (selectedAsset.isBTC) {
      if (!previousAssetIn || previousAssetIn.isBTC) {
        // Input was BTC (or null), now must be Rune
        const newAssetIn =
          popularRunes.length > 0 ? popularRunes[0] : BTC_ASSET; // Fallback needed if no popular runes
        setAssetIn(newAssetIn);
        // Since input asset type changed, reset amounts
        setOutputAmount("");
      }
      // else: Input was already a Rune, keep it. Amount reset handled below.
    } else {
      // If the NEW output asset is a Rune, ensure input is BTC
      setAssetIn(BTC_ASSET);
      // Check if the input asset type *actually* changed
      if (!previousAssetIn || !previousAssetIn.isBTC) {
        // Input was Rune (or null), now is BTC. Reset both amounts.
        setOutputAmount("");
      } else {
        // Input was already BTC and remains BTC. Keep inputAmount, just reset output.
        setOutputAmount("");
      }
    }

    // Always clear quote and related state when output asset changes
    setQuote(null);
    dispatchSwap({ type: "FETCH_QUOTE_ERROR", error: "" });
    setExchangeRate(null);
  };

  // --- Swap Direction Logic ---
  const handleSwapDirection = () => {
    if (!assetOut) {
      return;
    }
    const tempAsset = assetIn;
    setAssetIn(assetOut);
    setAssetOut(tempAsset);

    const tempAmount = inputAmount;
    setInputAmount(outputAmount);
    setOutputAmount(tempAmount);

    setQuote(null);
    dispatchSwap({ type: "FETCH_QUOTE_ERROR", error: "" });
    setExchangeRate(null);
    dispatchSwap({ type: "RESET_SWAP" });
  };

  // --- Quote & Price Calculation ---
  // Memoized quote fetching using API with throttling
  const handleFetchQuote = useCallback(async () => {
    // Safety checks for all required values
    if (!inputAmount || !parseFloat(inputAmount) || !assetIn || !assetOut) {
      return;
    }

    // Use direct input amount rather than debounced to avoid issues with first fetch
    const amount = parseFloat(inputAmount);

    // Check if we're currently throttled
    if (isThrottledRef.current) {
      return;
    }

    // Set throttle flag for a moderate period
    isThrottledRef.current = true;
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }

    // Clear throttle after delay
    throttleTimerRef.current = setTimeout(() => {
      isThrottledRef.current = false;
    }, 3000); // 3 second throttle

    // Increment and capture the request ID for this quote
    const requestId = ++latestQuoteRequestId.current;
    dispatchSwap({ type: "FETCH_QUOTE_START" });
    setOutputAmount(""); // Clear output immediately so loading state is visible
    setQuote(null); // Clear previous quote
    setExchangeRate(null); // Clear previous rate

    // Use MOCK_ADDRESS if no wallet is connected to allow quote fetching
    const effectiveAddress = address || MOCK_ADDRESS;
    if (!effectiveAddress) {
      dispatchSwap({
        type: "FETCH_QUOTE_ERROR",
        error: "Internal error: Missing address for quote.",
      });
      return;
    }

    // Extra validation for amount, already checked above but keeping for safety
    if (amount <= 0) {
      setOutputAmount("0.0");
      dispatchSwap({ type: "FETCH_QUOTE_SUCCESS" });
      return;
    }

    try {
      // Prevent BTC->BTC or invalid asset pairs
      if (
        (assetIn?.isBTC && assetOut?.isBTC) ||
        (!assetIn?.isBTC && !assetOut?.isBTC)
      ) {
        dispatchSwap({
          type: "FETCH_QUOTE_ERROR",
          error: "Invalid asset pair selected.",
        });
        return;
      }
      // Compute correct runeName for quote - use non-nullable values
      // We've already verified assetIn and assetOut exist above
      const runeName = assetIn.isBTC ? assetOut.name : assetIn.name;
      const isSell = !assetIn.isBTC;

      const params = {
        btcAmount: amount,
        runeName,
        address: effectiveAddress,
        sell: isSell,
      };

      // Add retry logic for API calls
      let attempts = 0;
      let quoteResponse;

      while (attempts < 2) {
        // Try up to 2 times
        try {
          quoteResponse = await fetchQuoteFromApi(params);
          break; // Success - exit the retry loop
        } catch (fetchError) {
          attempts++;
          if (attempts >= 2) {
            // Rethrow after final attempt
            throw fetchError;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
      // Only update state if this is the latest request
      if (requestId === latestQuoteRequestId.current) {
        setQuote(quoteResponse ?? null);
        setQuoteTimestamp(Date.now());
        let calculatedOutputAmount = "";
        let calculatedRate = null;
        if (quoteResponse) {
          const inputVal = parseFloat(inputAmount);
          let outputVal = 0;
          let btcValue = 0;
          let runeValue = 0;
          try {
            if (assetIn?.isBTC) {
              outputVal = parseFloat(
                (quoteResponse.totalFormattedAmount || "0").replace(/,/g, ""),
              );
              btcValue = inputVal;
              runeValue = outputVal;
              calculatedOutputAmount = outputVal.toLocaleString(undefined, {});
            } else {
              outputVal = parseFloat(
                (quoteResponse.totalPrice || "0").replace(/,/g, ""),
              );
              runeValue = inputVal;
              btcValue = outputVal;
              calculatedOutputAmount = outputVal.toLocaleString(undefined, {
                maximumFractionDigits: 8,
              });
            }
            if (btcValue > 0 && runeValue > 0 && btcPriceUsd) {
              const btcUsdAmount = btcValue * btcPriceUsd;
              const pricePerRune = btcUsdAmount / runeValue;
              calculatedRate = `${pricePerRune.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })} per ${assetIn && !assetIn.isBTC ? assetIn.name : assetOut?.name}`;
            }
            setExchangeRate(calculatedRate);
          } catch {
            calculatedOutputAmount = "Error";
            setExchangeRate("Error calculating rate");
          }
        }
        setOutputAmount(calculatedOutputAmount);
        dispatchSwap({ type: "FETCH_QUOTE_SUCCESS" });
      }
    } catch (err) {
      // Only update error state if this is the latest request
      if (requestId === latestQuoteRequestId.current) {
        // Format and categorize errors for better user experience
        let errorMessage =
          err instanceof Error ? err.message : "Failed to fetch quote";

        // Handle specific error types
        if (
          errorMessage.includes("500") ||
          errorMessage.includes("Internal Server Error")
        ) {
          errorMessage =
            "Server error: The quote service is temporarily unavailable. Please try again later.";
        } else if (errorMessage.includes("No valid orders")) {
          errorMessage =
            "No orders available for this trade. Try a different amount or rune.";
        } else if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("network")
        ) {
          errorMessage =
            "Network error: Please check your connection and try again.";
        }

        console.error(`Quote fetch error: ${errorMessage}`, err);

        dispatchSwap({
          type: "FETCH_QUOTE_ERROR",
          error: errorMessage,
        });
      }
    }
  }, [
    assetIn,
    assetOut,
    inputAmount,
    address,
    btcPriceUsd,
    dispatchSwap,
    setQuote,
    setExchangeRate,
    setOutputAmount,
  ]);

  // Track the quote fetch state with a simple string key
  const quoteKeyRef = useRef<string>("");

  const { handleSwap } = useSwapExecution({
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
  });

  // Single useEffect for handling debounced input changes
  useEffect(() => {
    // Successful swap - don't do anything
    if (swapState.txId || swapState.swapStep === "success") {
      return;
    }

    // Check if we have valid inputs for a quote
    const runeAsset = assetIn?.isBTC ? assetOut : assetIn;
    // Make sure all required values exist before considering it valid
    const hasValidInputAmount =
      typeof debouncedInputAmount === "number" && debouncedInputAmount > 0;
    const hasValidAssets =
      !!assetIn &&
      !!assetOut &&
      !!runeAsset &&
      typeof assetIn.id === "string" &&
      typeof assetOut.id === "string" &&
      !runeAsset.isBTC;

    // Generate a unique key for the current input state
    const currentKey =
      hasValidInputAmount && hasValidAssets
        ? `${debouncedInputAmount}-${assetIn.id}-${assetOut.id}`
        : "";

    // Fetch quote if inputs are valid and key has changed
    if (
      hasValidInputAmount &&
      hasValidAssets &&
      currentKey !== quoteKeyRef.current
    ) {
      // Don't fetch if we're throttled
      if (!isThrottledRef.current) {
        // We've already validated these values exist
        handleFetchQuote();
        // Update the key reference IMMEDIATELY after starting the fetch to prevent duplicates
        quoteKeyRef.current = currentKey;
      }
    }

    // Handle empty/invalid input clearing
    if (!hasValidInputAmount || !hasValidAssets) {
      // Skip during active swap
      if (swapState.isSwapping) {
        return;
      }

      // Clear any existing results only if needed
      if (quote || outputAmount || exchangeRate) {
        setQuote(null);
        setOutputAmount("");
        setExchangeRate(null);
      }

      // Only reset swap state for empty input with cooldown
      // We only want to reset if we've had a previous input and now it's empty
      if (
        (!debouncedInputAmount || debouncedInputAmount === 0) &&
        ![
          "success",
          "confirming",
          "signing",
          "getting_psbt",
          "fetching_quote",
        ].includes(swapState.swapStep) &&
        !swapState.isSwapping &&
        quoteKeyRef.current !== ""
      ) {
        // Only reset if we've had a previous input (key not empty)

        const currentTime = Date.now();
        const RESET_COOLDOWN = 5000; // Increased cooldown to reduce frequency

        if (
          !lastResetTimestampRef.current ||
          currentTime - lastResetTimestampRef.current > RESET_COOLDOWN
        ) {
          dispatchSwap({ type: "RESET_SWAP" });
          lastResetTimestampRef.current = currentTime;

          // Also reset the quote key when we reset the swap
          quoteKeyRef.current = "";
        }
      }
    }
  }, [
    debouncedInputAmount,
    assetIn,
    assetOut,
    swapState.txId,
    swapState.swapStep,
    swapState.isSwapping,
    dispatchSwap,
    handleFetchQuote,
    quote,
    outputAmount,
    exchangeRate,
  ]);

  // Clear stored quote timestamp when quote expires or swap is reset
  useEffect(() => {
    if (swapState.quoteExpired) {
      setQuoteTimestamp(null);
    }
  }, [swapState.quoteExpired]);

  // Add balance percentage helper functions
  const handlePercentageClick = (percentage: number) => {
    if (!connected || !assetIn) return;

    let availableBalance = 0;
    let decimals = 8; // Default decimals for BTC

    if (assetIn.isBTC) {
      if (btcBalanceSats !== undefined) {
        availableBalance = btcBalanceSats / 100_000_000;
      } else {
        return; // No balance available
      }
    } else {
      const rawBalance = getSpecificRuneBalance(assetIn.name);
      if (rawBalance === null) return;

      try {
        const balanceNum = parseFloat(rawBalance);
        if (isNaN(balanceNum)) return;

        decimals = swapRuneInfo?.decimals ?? 0;
        availableBalance = balanceNum / 10 ** decimals;
      } catch {
        return;
      }
    }

    // Calculate percentage of available balance
    let newAmount =
      percentage === 1 ? availableBalance : availableBalance * percentage;

    // Format with appropriate decimal places
    newAmount = Math.floor(newAmount * 10 ** decimals) / 10 ** decimals;

    // Convert to string with appropriate decimal places
    setInputAmount(newAmount.toString());
  };

  // --- Find specific rune balance --- (Helper Function)
  const getSpecificRuneBalance = (
    runeName: string | undefined,
  ): string | null => {
    if (!runeName || !runeBalances) return null;
    // Ordiscan returns names without spacers, so compare without them
    const formattedRuneName = normalizeRuneName(runeName);
    const found = runeBalances?.find((rb) => rb.name === formattedRuneName);
    return found ? found.balance : "0"; // Return '0' if not found, assuming 0 balance
  };

  const availableBalanceNode =
    connected && assetIn ? (
      assetIn.isBTC ? (
        isBtcBalanceLoading ? (
          <span className={styles.loadingText}>Loading{loadingDots}</span>
        ) : btcBalanceError ? (
          <span className={styles.errorText}>Error loading balance</span>
        ) : btcBalanceSats !== undefined ? (
          `${(btcBalanceSats / 100_000_000).toLocaleString(undefined, { maximumFractionDigits: 8 })}`
        ) : (
          "N/A"
        )
      ) : isRuneBalancesLoading || isSwapRuneInfoLoading ? (
        <span className={styles.loadingText}>Loading{loadingDots}</span>
      ) : runeBalancesError || swapRuneInfoError ? (
        <span className={styles.errorText}>Error loading balance</span>
      ) : (
        (() => {
          const rawBalance = getSpecificRuneBalance(assetIn.name);
          if (rawBalance === null) return "N/A";
          try {
            const balanceNum = parseFloat(rawBalance);
            if (isNaN(balanceNum)) return "Invalid Balance";
            const decimals = swapRuneInfo?.decimals ?? 0;
            const displayValue = balanceNum / 10 ** decimals;
            return `${displayValue.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
          } catch {
            return "Formatting Error";
          }
        })()
      )
    ) : null;

  return (
    <SwapTabForm
      connected={connected}
      assetIn={assetIn}
      assetOut={assetOut}
      inputAmount={inputAmount}
      outputAmount={outputAmount}
      onInputAmountChange={setInputAmount}
      onSelectAssetIn={handleSelectAssetIn}
      onSelectAssetOut={handleSelectAssetOut}
      onSwapDirection={handleSwapDirection}
      onPercentageClick={handlePercentageClick}
      availableRunes={availableRunes}
      isLoadingRunes={isLoadingRunes}
      currentRunesError={currentRunesError}
      availableBalanceNode={availableBalanceNode}
      inputUsdValue={inputUsdValue}
      outputUsdValue={outputUsdValue}
      exchangeRate={exchangeRate}
      isQuoteLoading={swapState.isQuoteLoading}
      isSwapping={swapState.isSwapping}
      quoteError={quoteError}
      swapError={swapState.swapError}
      quote={quote}
      quoteExpired={quoteExpired}
      swapStep={swapState.swapStep}
      txId={swapState.txId}
      loadingDots={loadingDots}
      onFetchQuote={handleFetchQuote}
      onSwap={handleSwap}
      debouncedInputAmount={debouncedInputAmount}
      showPriceChart={showPriceChart}
      onShowPriceChart={onShowPriceChart}
      isPreselectedRuneLoading={isPreselectedRuneLoading}
    />
  );
}

export default SwapTab;
