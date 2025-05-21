import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./SwapTab.module.css";
import debounce from "lodash.debounce";
import { useDebounce } from "use-debounce";
import { type QuoteResponse } from "satsterminal-sdk";
import { normalizeRuneName } from "@/utils/runeUtils";
import { Asset, BTC_ASSET } from "@/types/common";
import type { Rune } from "@/types/satsTerminal.ts";
import { InputArea } from "./InputArea";
import {
  fetchRunesFromApi,
  fetchPopularFromApi,
  fetchQuoteFromApi,
  fetchBtcBalanceFromApi,
  fetchRuneBalancesFromApi,
  fetchRuneInfoFromApi,
  fetchRuneMarketFromApi,
} from "@/lib/api";
import {
  type RuneBalance as OrdiscanRuneBalance,
  type RuneMarketInfo as OrdiscanRuneMarketInfo,
} from "@/types/ordiscan";
import { type RuneData } from "@/lib/runesData";

// Import our new components
import {
  SwapDirectionButton,
  SwapButton,
  PriceInfoPanel,
  SwapStatusMessages,
  useSwapProcessManager,
} from "./swap";
import useSwapExecution from "@/hooks/useSwapExecution";

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

  // Track if the preselected rune has been loaded
  const [hasLoadedPreselectedRune, setHasLoadedPreselectedRune] =
    useState(false);

  // State for rune fetching/searching
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPopularLoading, setIsPopularLoading] = useState(
    isPopularRunesLoading,
  );
  const [popularRunes, setPopularRunes] = useState<Asset[]>([]);
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [popularError, setPopularError] = useState<string | null>(
    popularRunesError ? popularRunesError.message : null,
  );
  // Add a loading state specifically for a preselected rune
  const [isPreselectedRuneLoading, setIsPreselectedRuneLoading] =
    useState(!!preSelectedRune);

  // Determine which runes to display
  const availableRunes = searchQuery.trim() ? searchResults : popularRunes;
  const isLoadingRunes = searchQuery.trim() ? isSearching : isPopularLoading;
  const currentRunesError = searchQuery.trim() ? searchError : popularError;

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

  // Handle pre-selected rune
  useEffect(() => {
    const findAndSelectRune = async () => {
      if (preSelectedRune && !hasLoadedPreselectedRune) {
        // Show loading state while searching
        setIsPreselectedRuneLoading(true);

        // Force search for the rune if it changes
        // Normalize names by removing spacers for comparison
        const normalizedPreSelected = normalizeRuneName(preSelectedRune);

        // Try to find in available runes first
        const rune = availableRunes.find(
          (r) => normalizeRuneName(r.name) === normalizedPreSelected,
        );

        if (rune) {
          // Found in available runes, set it
          setAssetIn(BTC_ASSET);
          setAssetOut(rune);
          setIsPreselectedRuneLoading(false);
          setHasLoadedPreselectedRune(true);

          // Clear the URL parameter
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("rune");
            window.history.replaceState({}, "", url.toString());
          }

          // Clear search field after loading
          setSearchQuery("");
        } else {
          // Not found in available runes, search for it
          try {
            setIsSearching(true);
            const searchResults = await fetchRunesFromApi(preSelectedRune);

            if (searchResults && searchResults.length > 0) {
              // Find closest match
              const matchingRune = searchResults.find(
                (r) => normalizeRuneName(r.name) === normalizedPreSelected,
              );

              // If found a match or just take the first result if no exact match
              const foundRune = matchingRune || searchResults[0];

              // Convert to Asset format
              const foundAsset: Asset = {
                id: foundRune.id,
                name: foundRune.name,
                imageURI: foundRune.imageURI,
                isBTC: false,
              };

              // Add to search results
              setSearchResults((prev) => {
                // Avoid duplicates
                if (!prev.some((r) => r.id === foundAsset.id)) {
                  return [...prev, foundAsset];
                }
                return prev;
              });

              // Set as output asset
              setAssetIn(BTC_ASSET);
              setAssetOut(foundAsset);
              setIsPreselectedRuneLoading(false);
              setHasLoadedPreselectedRune(true);

              // Clear the URL parameter
              if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.delete("rune");
                window.history.replaceState({}, "", url.toString());
              }

              // Clear search field
              setSearchQuery("");
            }
          } catch {
            // Error handled in finally block
          } finally {
            setIsSearching(false);
            setIsPreselectedRuneLoading(false);
            setHasLoadedPreselectedRune(true);

            // Clear the URL parameter even if there was an error
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("rune");
              window.history.replaceState({}, "", url.toString());
            }

            // Clear search field
            setSearchQuery("");
          }
        }
      } else if (!preSelectedRune) {
        // No preselected rune, ensure loading state is cleared
        setIsPreselectedRuneLoading(false);
        setHasLoadedPreselectedRune(false);
      }
    };

    findAndSelectRune();
  }, [preSelectedRune, availableRunes, hasLoadedPreselectedRune, searchQuery]);

  // Fetch popular runes on mount using API
  const hasLoadedPopularRunes = useRef(false);

  useEffect(() => {
    const fetchPopular = async () => {
      if (hasLoadedPopularRunes.current) return;

      // If we already have cached popular runes, use them instead of fetching again
      if (cachedPopularRunes && cachedPopularRunes.length > 0) {
        const liquidiumToken: Asset = {
          id: "liquidiumtoken",
          name: "LIQUIDIUM•TOKEN",
          imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
          isBTC: false,
        };

        // Map the cached data to Asset format
        const fetchedRunes: Asset[] = cachedPopularRunes
          .map((collection: Record<string, unknown>) => {
            const runeName =
              ((collection?.etching as Record<string, unknown>)
                ?.runeName as string) ||
              (collection?.rune as string) ||
              "Unknown";
            return {
              id: (collection?.rune as string) || `unknown_${Math.random()}`,
              name: runeName,
              imageURI:
                (collection?.icon_content_url_data as string) ||
                (collection?.imageURI as string),
              isBTC: false,
            };
          })
          .filter(
            (rune) =>
              rune.id !== liquidiumToken.id &&
              normalizeRuneName(rune.name) !==
                normalizeRuneName(liquidiumToken.name),
          );

        // Prepend the hardcoded token ONLY if no pre-selected rune
        const mappedRunes = preSelectedRune
          ? fetchedRunes
          : [liquidiumToken, ...fetchedRunes];
        setPopularRunes(mappedRunes);

        // Only set default assetOut if there's no pre-selected rune and no current assetOut and no search query
        if (
          !preSelectedRune &&
          !assetOut &&
          !searchQuery &&
          mappedRunes.length > 0
        ) {
          setAssetOut(mappedRunes[0]);
        }

        setIsPopularLoading(false);
        hasLoadedPopularRunes.current = true;
        return;
      }

      // If no cached data, fetch from API
      setIsPopularLoading(true);
      setPopularError(null);
      setPopularRunes([]);
      try {
        // Define the hardcoded asset
        const liquidiumToken: Asset = {
          id: "liquidiumtoken",
          name: "LIQUIDIUM•TOKEN",
          imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
          isBTC: false,
        };

        const response = await fetchPopularFromApi();
        let mappedRunes: Asset[] = [];

        if (!Array.isArray(response)) {
          mappedRunes = [liquidiumToken];
        } else {
          const fetchedRunes: Asset[] = response
            .map((collection: Record<string, unknown>) => ({
              id: (collection?.rune as string) || `unknown_${Math.random()}`,
              name:
                ((collection?.etching as Record<string, unknown>)
                  ?.runeName as string) ||
                (collection?.rune as string) ||
                "Unknown",
              imageURI:
                (collection?.icon_content_url_data as string) ||
                (collection?.imageURI as string),
              isBTC: false,
            }))
            .filter(
              (rune) =>
                rune.id !== liquidiumToken.id &&
                normalizeRuneName(rune.name) !==
                  normalizeRuneName(liquidiumToken.name),
            );

          mappedRunes = [liquidiumToken, ...fetchedRunes];
        }

        setPopularRunes(mappedRunes);

        // Only set default assetOut if there's no pre-selected rune and no current assetOut
        if (!preSelectedRune && !assetOut && mappedRunes.length > 0) {
          setAssetOut(mappedRunes[0]);
        }
      } catch (error) {
        setPopularError(
          error instanceof Error
            ? error.message
            : "Failed to fetch popular runes",
        );
        const liquidiumTokenOnError: Asset = {
          id: "liquidiumtoken",
          name: "LIQUIDIUM•TOKEN",
          imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
          isBTC: false,
        };
        // Only set Liquidium Token if no pre-selected rune
        setPopularRunes(preSelectedRune ? [] : [liquidiumTokenOnError]);

        // Only set default assetOut if there's no pre-selected rune and no current assetOut
        if (!preSelectedRune && !assetOut) {
          setAssetOut(liquidiumTokenOnError);
        }
      } finally {
        setIsPopularLoading(false);
        hasLoadedPopularRunes.current = true;
      }
    };
    fetchPopular();
  }, [cachedPopularRunes, preSelectedRune]);

  // State for calculated prices
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [inputUsdValue, setInputUsdValue] = useState<string | null>(null);
  const [outputUsdValue, setOutputUsdValue] = useState<string | null>(null);

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

  // Effect for loading dots animation (with proper cycling animation)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (
      isBtcPriceLoading ||
      isSearching ||
      swapState.isQuoteLoading ||
      swapState.isSwapping
    ) {
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
  }, [
    isBtcPriceLoading,
    isSearching,
    swapState.isQuoteLoading,
    swapState.isSwapping,
  ]); // Added more dependencies

  // Create a debounced search function - MEMOIZED
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query) {
          setSearchResults([]);
          setIsSearching(false);
          setSearchError(null);
          return;
        }
        setIsSearching(true);
        setSearchError(null);
        try {
          // *** Ensure this uses the API fetch function ***
          const results: Rune[] = await fetchRunesFromApi(query);
          // Map results to Asset type for consistency in the component
          const mappedResults: Asset[] = results.map((rune) => ({
            id: rune.id,
            name: rune.name,
            imageURI: rune.imageURI,
            isBTC: false,
          }));
          setSearchResults(mappedResults); // Store as Asset[]
        } catch (error: unknown) {
          setSearchError(
            error instanceof Error ? error.message : "Failed to search",
          );
          setSearchResults([]); // Clear results on error
        } finally {
          setIsSearching(false);
        }
      }, 300),
    [],
  ); // <-- Empty dependency array ensures it's created only once

  // Clean up the debounced function on component unmount
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  // Search functionality now handled by InputArea component

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
    setInputUsdValue(null);
    setOutputUsdValue(null);
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
    setInputUsdValue(null);
    setOutputUsdValue(null);
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
    setInputUsdValue(null);
    setOutputUsdValue(null);
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
        setInputUsdValue(null);
        setOutputUsdValue(null);
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

  // UseEffect to calculate input USD value
  useEffect(() => {
    if (!inputAmount || !assetIn || isBtcPriceLoading || btcPriceError) {
      setInputUsdValue(null);
      setOutputUsdValue(null);
      return;
    }

    try {
      const amountNum = parseFloat(inputAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setInputUsdValue(null);
        setOutputUsdValue(null);
        return;
      }

      let inputUsdVal: number | null = null;

      if (assetIn.isBTC && btcPriceUsd) {
        // Input is BTC
        inputUsdVal = amountNum * btcPriceUsd;
      } else if (!assetIn.isBTC && inputRuneMarketInfo) {
        // Input is Rune, use market info
        inputUsdVal = amountNum * inputRuneMarketInfo.price_in_usd;
      } else if (
        !assetIn.isBTC &&
        quote &&
        quote.totalPrice &&
        btcPriceUsd &&
        !quoteError
      ) {
        // Fallback to quote calculation if market info not available
        const btcPerRune =
          quote.totalPrice &&
          quote.totalFormattedAmount &&
          parseFloat(quote.totalFormattedAmount.replace(/,/g, "")) > 0
            ? parseFloat(quote.totalPrice.replace(/,/g, "")) /
              parseFloat(quote.totalFormattedAmount.replace(/,/g, ""))
            : 0;

        if (btcPerRune > 0) {
          inputUsdVal = amountNum * btcPerRune * btcPriceUsd;
        }
      }

      // Calculate output USD value
      let outputUsdVal: number | null = null;
      if (outputAmount && assetOut) {
        // Remove commas from outputAmount before parsing
        const sanitizedOutputAmount = outputAmount.replace(/,/g, "");
        const outputAmountNum = parseFloat(sanitizedOutputAmount);

        if (!isNaN(outputAmountNum) && outputAmountNum > 0) {
          if (assetOut.isBTC && btcPriceUsd) {
            // Output is BTC
            outputUsdVal = outputAmountNum * btcPriceUsd;
          } else if (!assetOut.isBTC && outputRuneMarketInfo) {
            // Output is Rune, use market info
            outputUsdVal = outputAmountNum * outputRuneMarketInfo.price_in_usd;
          } else if (
            !assetOut.isBTC &&
            quote &&
            quote.totalPrice &&
            btcPriceUsd &&
            !quoteError
          ) {
            // Fallback to quote calculation if market info not available
            const btcPerRune =
              quote.totalPrice &&
              quote.totalFormattedAmount &&
              parseFloat(quote.totalFormattedAmount.replace(/,/g, "")) > 0
                ? parseFloat(quote.totalPrice.replace(/,/g, "")) /
                  parseFloat(quote.totalFormattedAmount.replace(/,/g, ""))
                : 0;

            if (btcPerRune > 0) {
              outputUsdVal = outputAmountNum * btcPerRune * btcPriceUsd;
            }
          }
        }
      }

      // Format and set input USD value
      if (inputUsdVal !== null && inputUsdVal > 0) {
        setInputUsdValue(
          inputUsdVal.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        );
      } else {
        setInputUsdValue(null);
      }

      // Format and set output USD value
      if (outputUsdVal !== null && outputUsdVal > 0) {
        setOutputUsdValue(
          outputUsdVal.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        );
      } else {
        setOutputUsdValue(null);
      }
    } catch {
      setInputUsdValue(null);
      setOutputUsdValue(null);
    }
  }, [
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

  // Use new components in the component render logic
  return (
    <div className={styles.swapTabContainer}>
      <h1 className="heading">Swap</h1>

      {/* Input Area */}
      <InputArea
        label="You Pay"
        inputId="input-amount"
        inputValue={inputAmount}
        onInputChange={setInputAmount}
        placeholder="0.0"
        min="0"
        step="0.001"
        assetSelectorEnabled={true}
        selectedAsset={assetIn}
        onAssetChange={handleSelectAssetIn}
        availableAssets={availableRunes}
        showBtcInSelector={true}
        isAssetsLoading={isLoadingRunes}
        assetsError={currentRunesError}
        showPercentageShortcuts={connected && !!assetIn}
        onPercentageClick={handlePercentageClick}
        availableBalance={
          connected && assetIn ? (
            assetIn.isBTC ? (
              isBtcBalanceLoading ? (
                <span className={styles.loadingText}>Loading{loadingDots}</span>
              ) : btcBalanceError ? (
                <span className={styles.errorText}>Error loading balance</span>
              ) : btcBalanceSats !== undefined ? (
                `${(btcBalanceSats / 100_000_000).toLocaleString(undefined, { maximumFractionDigits: 8 })}`
              ) : (
                "N/A" // Should not happen if connected
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
                  // Formatting error occurred
                  return "Formatting Error";
                }
              })()
            )
          ) : null
        }
        usdValue={inputUsdValue || undefined}
      />

      {/* Swap Direction Button */}
      <SwapDirectionButton
        assetIn={assetIn}
        assetOut={assetOut}
        disabled={
          !assetIn ||
          !assetOut ||
          swapState.isSwapping ||
          swapState.isQuoteLoading
        }
        onClick={handleSwapDirection}
      />

      {/* Output Area */}
      <InputArea
        label="You Receive (Estimated)"
        inputId="output-amount"
        inputValue={
          swapState.isQuoteLoading ? `Loading${loadingDots}` : outputAmount
        }
        placeholder="0.0"
        readOnly={true}
        assetSelectorEnabled={true}
        selectedAsset={assetOut}
        onAssetChange={handleSelectAssetOut}
        availableAssets={availableRunes}
        showBtcInSelector={true}
        isAssetsLoading={isLoadingRunes}
        assetsError={currentRunesError}
        isPreselectedAssetLoading={isPreselectedRuneLoading}
        usdValue={outputUsdValue || undefined}
        errorMessage={
          quoteError && !swapState.isQuoteLoading ? quoteError : undefined
        }
        bottomContent={
          quoteError && !swapState.isQuoteLoading ? (
            <div
              className="smallText"
              style={{ whiteSpace: "normal", wordBreak: "break-word" }}
            >
              Please retry the swap, reconnect your wallet, or try a different
              amount.
            </div>
          ) : undefined
        }
      />

      {/* Price Info Panel */}
      <PriceInfoPanel
        assetIn={assetIn}
        assetOut={assetOut}
        exchangeRate={exchangeRate}
        isQuoteLoading={swapState.isQuoteLoading}
        quoteError={quoteError}
        debouncedInputAmount={debouncedInputAmount}
        loadingDots={loadingDots}
        showPriceChart={showPriceChart}
        onShowPriceChart={onShowPriceChart}
      />

      {/* Swap Button */}
      <SwapButton
        connected={connected}
        assetIn={assetIn}
        assetOut={assetOut}
        inputAmount={inputAmount}
        isQuoteLoading={swapState.isQuoteLoading}
        isSwapping={swapState.isSwapping}
        quoteError={quoteError}
        quote={quote}
        quoteExpired={quoteExpired}
        swapStep={swapState.swapStep}
        txId={swapState.txId}
        loadingDots={loadingDots}
        onFetchQuote={handleFetchQuote}
        onSwap={handleSwap}
      />

      {/* Status Messages */}
      <SwapStatusMessages
        isSwapping={swapState.isSwapping}
        swapStep={swapState.swapStep}
        swapError={swapState.swapError}
        txId={swapState.txId}
        loadingDots={loadingDots}
      />
    </div>
  );
}

export default SwapTab;
