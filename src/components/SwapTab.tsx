import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./SwapTab.module.css";
import { type QuoteResponse } from "satsterminal-sdk";
import { normalizeRuneName } from "@/utils/runeUtils";
import { Asset, BTC_ASSET } from "@/types/common";
import {
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
import useSwapQuote from "@/hooks/useSwapQuote";
import useUsdValues from "@/hooks/useUsdValues";
import SwapFeeSelector from "./SwapFeeSelector";

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
  const [feeRate, setFeeRate] = useState(0);

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

  const {
    handleFetchQuote,
    debouncedInputAmount,
    quoteKeyRef,
    isThrottledRef,
  } = useSwapQuote({
    inputAmount,
    assetIn,
    assetOut,
    address,
    btcPriceUsd,
    swapState,
    dispatchSwap,
    quote,
    setQuote,
    outputAmount,
    setOutputAmount,
    exchangeRate,
    setExchangeRate,
    setQuoteTimestamp,
  });

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
    selectedFeeRate: feeRate,
  });

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
      feeSelector={
        quote && !quoteError ? <SwapFeeSelector onChange={setFeeRate} /> : null
      }
    />
  );
}

export default SwapTab;
