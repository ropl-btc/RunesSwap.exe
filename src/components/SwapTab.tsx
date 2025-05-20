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
import {
  type QuoteResponse,
  type RuneOrder,
  type GetPSBTParams,
  type ConfirmPSBTParams,
} from "satsterminal-sdk";
import { normalizeRuneName } from "@/utils/runeUtils";
import { Asset, BTC_ASSET } from "@/types/common";
import type { Rune } from "@/types/satsTerminal.ts";
import { InputArea } from "./InputArea";
import {
  fetchRunesFromApi,
  fetchPopularFromApi,
  fetchQuoteFromApi,
  getPsbtFromApi,
  confirmPsbtViaApi,
  fetchBtcBalanceFromApi,
  fetchRuneBalancesFromApi,
  fetchRuneInfoFromApi,
  fetchRuneMarketFromApi,
  fetchRecommendedFeeRates,
  QUERY_KEYS,
} from "@/lib/apiClient";
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

  // Track the latest error message for use in the finally block
  const errorMessageRef = useRef<string | null>(null);

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
  useEffect(() => {
    const fetchPopular = async () => {
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
      }
    };
    fetchPopular();
  }, [cachedPopularRunes, preSelectedRune, assetOut, searchQuery]);

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

  // Query for current recommended Bitcoin fee rates
  const { data: recommendedFeeRates } = useQuery({
    queryKey: [QUERY_KEYS.BTC_FEE_RATES],
    queryFn: fetchRecommendedFeeRates,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
    console.log("handleSelectAssetIn called with:", {
      selectedAsset: selectedAsset
        ? `${selectedAsset.name} (${selectedAsset.isBTC ? "BTC" : "RUNE"})`
        : "null",
      currentAssetOut: assetOut
        ? `${assetOut.name} (${assetOut.isBTC ? "BTC" : "RUNE"})`
        : "null",
    });

    // If user tries to select the same asset that's already in the output,
    // swap the assets instead of blocking the selection
    if (assetOut && selectedAsset.id === assetOut.id) {
      console.log(
        "Same asset selected for input as output - triggering swap direction",
      );
      handleSwapDirection();
      return;
    }

    setAssetIn(selectedAsset);
    // If selected asset is BTC, ensure output is a Rune
    if (selectedAsset.isBTC) {
      if (!assetOut || assetOut.isBTC) {
        // Set to first available rune or null if none
        const newAssetOut = popularRunes.length > 0 ? popularRunes[0] : null;
        console.log(
          "Selected BTC as input, setting output to:",
          newAssetOut ? `${newAssetOut.name} (Rune)` : "null",
        );
        setAssetOut(newAssetOut);
      }
    } else {
      // If selected asset is a Rune, ensure output is BTC
      console.log("Selected Rune as input, setting output to BTC");
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
    console.log("handleSelectAssetOut called with:", {
      selectedAsset: selectedAsset
        ? `${selectedAsset.name} (${selectedAsset.isBTC ? "BTC" : "RUNE"})`
        : "null",
      currentAssetIn: assetIn
        ? `${assetIn.name} (${assetIn.isBTC ? "BTC" : "RUNE"})`
        : "null",
    });

    // If user tries to select the same asset that's already in the input,
    // swap the assets instead of blocking the selection
    if (assetIn && selectedAsset.id === assetIn.id) {
      console.log(
        "Same asset selected for output as input - triggering swap direction",
      );
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
        console.log(
          "Selected BTC as output, setting input to:",
          newAssetIn
            ? `${newAssetIn.name} (${newAssetIn.isBTC ? "BTC" : "RUNE"})`
            : "null",
        );
        setAssetIn(newAssetIn);
        // Since input asset type changed, reset amounts
        setOutputAmount("");
      }
      // else: Input was already a Rune, keep it. Amount reset handled below.
    } else {
      // If the NEW output asset is a Rune, ensure input is BTC
      console.log("Selected Rune as output, setting input to BTC");
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

    // Schedule a check to validate the new asset configuration
    setTimeout(() => {
      console.log("Post asset selection check:", {
        assetIn: assetIn
          ? `${assetIn.name} (${assetIn.isBTC ? "BTC" : "RUNE"})`
          : "null",
        assetOut: assetOut
          ? `${assetOut.name} (${assetOut.isBTC ? "BTC" : "RUNE"})`
          : "null",
        isValid: assetIn && assetOut && assetIn.isBTC !== assetOut.isBTC,
      });
    }, 100);
  };

  // Create refs for tracking swap state and prevent race conditions
  const swapInProgressRef = useRef(false);

  // Add refs to track the actual asset states after updates
  const pendingAssetInRef = useRef<Asset | null>(null);
  const pendingAssetOutRef = useRef<Asset | null>(null);

  // Create an effect to monitor asset state changes
  useEffect(() => {
    // Only log when swap is in progress to avoid spam
    if (swapInProgressRef.current) {
      console.log("ASSET STATE CHANGED:", {
        assetIn: assetIn
          ? `${assetIn.name} (${assetIn.isBTC ? "BTC" : "RUNE"})`
          : "null",
        assetOut: assetOut
          ? `${assetOut.name} (${assetOut.isBTC ? "BTC" : "RUNE"})`
          : "null",
        pendingAssetIn: pendingAssetInRef.current
          ? `${pendingAssetInRef.current.name} (${pendingAssetInRef.current.isBTC ? "BTC" : "RUNE"})`
          : "null",
        pendingAssetOut: pendingAssetOutRef.current
          ? `${pendingAssetOutRef.current.name} (${pendingAssetOutRef.current.isBTC ? "BTC" : "RUNE"})`
          : "null",
        isValid: assetIn && assetOut && assetIn.isBTC !== assetOut.isBTC,
      });

      // Check if we reached our target state
      if (pendingAssetInRef.current && pendingAssetOutRef.current) {
        const matchesExpected =
          assetIn === pendingAssetInRef.current &&
          assetOut === pendingAssetOutRef.current;

        if (matchesExpected) {
          console.log("✅ Asset state matches expected target!");
        }
      }

      // Check for invalid state
      if (assetIn && assetOut && assetIn.isBTC === assetOut.isBTC) {
        console.error("❌ INVALID STATE DETECTED IN EFFECT:", {
          assetIn: assetIn
            ? `${assetIn.name} (${assetIn.isBTC ? "BTC" : "RUNE"})`
            : "null",
          assetOut: assetOut
            ? `${assetOut.name} (${assetOut.isBTC ? "BTC" : "RUNE"})`
            : "null",
        });
      }
    }
  }, [assetIn, assetOut]);

  // Create ref to store a temporary asset pair state during swaps
  const tempAssetPairRef = useRef<{ in: Asset | null; out: Asset | null }>({
    in: null,
    out: null,
  });

  // --- Swap Direction Logic ---
  const handleSwapDirection = () => {
    console.log("------------------------------------------------------------");
    console.log("⚠️ Swap direction triggered:", {
      before: {
        assetIn: assetIn
          ? `${assetIn.name} (${assetIn.isBTC ? "BTC" : "RUNE"})`
          : "null",
        assetOut: assetOut
          ? `${assetOut.name} (${assetOut.isBTC ? "BTC" : "RUNE"})`
          : "null",
        inputAmount,
        outputAmount,
      },
    });

    // Prevent double swaps
    if (swapInProgressRef.current) {
      console.log("Swap already in progress, ignoring this request");
      return;
    }

    // Mark swap as in progress
    swapInProgressRef.current = true;

    // Ensure we have valid assets
    if (!assetIn || !assetOut) {
      console.log("Cannot swap direction: missing assets");
      swapInProgressRef.current = false;
      return;
    }

    // ⚠️ CRITICAL: DISABLE THE RESET_SWAP TRIGGER
    // Prevent reset_swap from being triggered during asset changes
    lastResetTimestampRef.current = Date.now() + 5000; // Block reset for 5 seconds

    // Decide which direction to go
    let newAssetIn: Asset, newAssetOut: Asset;

    if (assetIn.isBTC && !assetOut.isBTC) {
      // Currently BTC->RUNE, switch to RUNE->BTC
      console.log("🔄 Switching from BTC->RUNE to RUNE->BTC");
      newAssetIn = assetOut; // The Rune
      newAssetOut = BTC_ASSET; // BTC
    } else if (!assetIn.isBTC && assetOut.isBTC) {
      // Currently RUNE->BTC, switch to BTC->RUNE
      console.log("🔄 Switching from RUNE->BTC to BTC->RUNE");
      newAssetIn = BTC_ASSET; // BTC
      newAssetOut = assetIn; // The Rune
    } else {
      // Invalid current state - force a valid configuration
      console.warn(
        "⚠️ WARNING: Invalid current pair detected, forcing to BTC->RUNE",
      );

      // Always default to BTC->Rune
      newAssetIn = BTC_ASSET;

      // Find a Rune to use (either from current assets or popular runes)
      const runeAsset = !assetIn.isBTC
        ? assetIn
        : !assetOut.isBTC
          ? assetOut
          : popularRunes.length > 0
            ? popularRunes[0]
            : null;

      if (!runeAsset) {
        console.error("❌ CRITICAL ERROR: No Rune asset available");
        swapInProgressRef.current = false;
        return;
      }

      newAssetOut = runeAsset;
    }

    console.log("🎯 TARGET swap configuration:", {
      from: {
        assetIn: assetIn
          ? `${assetIn.name} (${assetIn.isBTC ? "BTC" : "RUNE"})`
          : "null",
        assetOut: assetOut
          ? `${assetOut.name} (${assetOut.isBTC ? "BTC" : "RUNE"})`
          : "null",
      },
      to: {
        assetIn: newAssetIn
          ? `${newAssetIn.name} (${newAssetIn.isBTC ? "BTC" : "RUNE"})`
          : "null",
        assetOut: newAssetOut
          ? `${newAssetOut.name} (${newAssetOut.isBTC ? "BTC" : "RUNE"})`
          : "null",
      },
    });

    // Validate the target pair
    if (newAssetIn.isBTC === newAssetOut.isBTC) {
      console.error(
        "❌ Invalid asset pair configured. Aborting swap operation.",
      );
      swapInProgressRef.current = false;
      return;
    }

    // Save the target pair to the temp ref
    tempAssetPairRef.current = {
      in: newAssetIn,
      out: newAssetOut,
    };

    // Clear quote-related state first
    setQuote(null);
    setExchangeRate(null);
    setInputUsdValue(null);
    setOutputUsdValue(null);

    // Clear error state for a clean swap
    dispatchSwap({ type: "FETCH_QUOTE_ERROR", error: "" });

    // Swap amounts
    const tempAmount = inputAmount;
    setInputAmount(outputAmount);
    setOutputAmount(tempAmount);

    // ⚠️ CRITICAL CHANGE: Create an async function to perform the asset swap atomically
    // This ensures we don't have intermediate invalid states
    const performAtomicAssetSwap = async () => {
      try {
        // Store original state in case we need to restore
        const originalAssetIn = assetIn;
        const originalAssetOut = assetOut;

        // Reset to a known good state first - use BTC -> First Rune
        // This ensures we don't have any invalid intermediate state
        const safeRune = popularRunes.length > 0 ? popularRunes[0] : null;

        if (!safeRune) {
          console.error("❌ Critical error: No safe rune available for swap");
          return;
        }

        // First clear the state completely (no assets -> cannot be invalid)
        await new Promise<void>((resolve) => {
          console.log("🧹 Clearing asset state temporarily");
          // Set temporary null values for failsafe clearing
          setAssetIn(null);
          setAssetOut(null);
          setTimeout(resolve, 20);
        });

        // Then set to the desired end state
        await new Promise<void>((resolve) => {
          console.log("🔄 Setting final asset pair atomically");
          // Use the ref to set both values at once
          const finalIn = tempAssetPairRef.current.in;
          const finalOut = tempAssetPairRef.current.out;

          if (finalIn && finalOut) {
            // Set both at once to avoid intermediate invalid states
            setAssetIn(finalIn);
            setAssetOut(finalOut);
          } else {
            // Fallback to original values if something went wrong
            console.warn("⚠️ Using fallback values for asset swap");
            setAssetIn(originalAssetIn);
            setAssetOut(originalAssetOut);
          }

          setTimeout(resolve, 20);
        });

        console.log("✅ Asset swap completed successfully");
      } catch (error) {
        console.error("❌ Error during atomic asset swap:", error);
      } finally {
        // Reset the swap flag to allow further operations
        swapInProgressRef.current = false;
      }
    };

    // Execute the atomic swap
    performAtomicAssetSwap().then(() => {
      console.log("✅ Swap direction operation complete");
      console.log(
        "------------------------------------------------------------",
      );
    });
  };

  // --- Quote & Price Calculation ---
  // Memoized quote fetching using API with throttling
  const handleFetchQuote = useCallback(async () => {
    // Safety checks for all required values
    if (!inputAmount || !parseFloat(inputAmount) || !assetIn || !assetOut) {
      console.log("Missing required inputs for quote", {
        inputAmount,
        assetIn,
        assetOut,
      });
      return;
    }

    // Use direct input amount rather than debounced to avoid issues with first fetch
    const amount = parseFloat(inputAmount);

    // Check if we're currently throttled
    if (isThrottledRef.current) {
      console.log("Quote fetch throttled, skipping this request");
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

      // Log the request parameters for debugging
      console.log(
        `Fetching quote: ${isSell ? "Selling" : "Buying"} ${runeName}, amount: ${amount}`,
      );

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
          console.log(`Quote fetch attempt ${attempts} failed, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
      // Only update state if this is the latest request
      if (requestId === latestQuoteRequestId.current) {
        setQuote(quoteResponse);
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

  // Single useEffect for handling debounced input changes
  useEffect(() => {
    // Successful swap - don't do anything
    if (swapState.txId || swapState.swapStep === "success") {
      console.log("Transaction already completed, skipping quote fetch");
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
      console.log(
        `Input values changed: ${quoteKeyRef.current} -> ${currentKey}`,
      );

      // Don't fetch if we're throttled
      if (!isThrottledRef.current) {
        console.log("Fetching quote for new input combination");
        // We've already validated these values exist
        handleFetchQuote();
        // Update the key reference IMMEDIATELY after starting the fetch to prevent duplicates
        quoteKeyRef.current = currentKey;
      } else {
        console.log("Throttled, skipping fetch");
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
        console.log("Clearing quote-related UI state for invalid inputs");
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
          console.log(
            "Clearing swap state due to zero input after previous input",
          );
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

  // Function to handle the entire swap process using API
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
        type: "SET_GENERIC_ERROR",
        error:
          "Missing connection details, assets, or quote. Please connect wallet and ensure quote is fetched.",
      });
      dispatchSwap({
        type: "SWAP_ERROR",
        error:
          "Missing connection details, assets, or quote. Please connect wallet and ensure quote is fetched.",
      });
      return;
    }

    if (!quoteTimestamp || Date.now() - quoteTimestamp > 60000) {
      dispatchSwap({ type: "QUOTE_EXPIRED" });
      dispatchSwap({
        type: "SET_GENERIC_ERROR",
        error: "Quote expired. Please fetch a new one.",
      });
      return;
    }

    // Proceed with the swap process - only dispatch SWAP_START, not FETCH_QUOTE_START
    // This prevents duplicate loading states that can cause button to remain disabled on cancellation
    dispatchSwap({ type: "SWAP_START" });

    try {
      // 1. Get PSBT via API
      dispatchSwap({ type: "SWAP_STEP", step: "getting_psbt" });
      // Patch orders: ensure numeric fields are numbers and side is uppercase if present
      const orders: RuneOrder[] = (quote.selectedOrders || []).map((order) => {
        const patchedOrder: Partial<RuneOrder> = {
          ...order,
          price:
            typeof order.price === "string" ? Number(order.price) : order.price,
          formattedAmount:
            typeof order.formattedAmount === "string"
              ? Number(order.formattedAmount)
              : order.formattedAmount,
          slippage:
            order.slippage !== undefined && typeof order.slippage === "string"
              ? Number(order.slippage)
              : order.slippage,
        };
        if ("side" in order && order.side)
          (patchedOrder as Record<string, unknown>)["side"] = String(
            order.side,
          ).toLowerCase() as "buy" | "sell";
        return patchedOrder as RuneOrder;
      });

      // Get the optimal fee rate from the mempool.space API, falling back to defaults
      // Use appropriate fee rate based on transaction type (higher for selling runes)
      const optimalFeeRate = recommendedFeeRates
        ? !isBtcToRune
          ? recommendedFeeRates.fastestFee // Use fastest fee for selling runes (higher priority)
          : recommendedFeeRates.halfHourFee // Use half-hour fee for buying runes (medium priority)
        : 15; // Fallback if API data isn't available

      // Log fee rate info for essential monitoring
      console.log(
        `Using ${optimalFeeRate} sat/vB fee rate for ${!isBtcToRune ? "selling" : "buying"} transaction`,
      );

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
        const psbtResult = await getPsbtFromApi(psbtParams);

        const mainPsbtBase64 =
          (psbtResult as unknown as { psbtBase64?: string; psbt?: string })
            ?.psbtBase64 ||
          (psbtResult as unknown as { psbtBase64?: string; psbt?: string })
            ?.psbt;
        const swapId = (psbtResult as unknown as { swapId?: string })?.swapId;
        const rbfPsbtBase64 = (
          psbtResult as unknown as { rbfProtected?: { base64?: string } }
        )?.rbfProtected?.base64;

        if (!mainPsbtBase64 || !swapId) {
          throw new Error(
            `Invalid PSBT data received from API: ${JSON.stringify(psbtResult)}`,
          );
        }

        // 2. Sign PSBT(s) - Remains client-side via LaserEyes
        console.log("Step 2: Signing PSBT with wallet...");
        dispatchSwap({ type: "SWAP_STEP", step: "signing" });
        const mainSigningResult = await signPsbt(mainPsbtBase64);
        const signedMainPsbt = mainSigningResult?.signedPsbtBase64;
        if (!signedMainPsbt) {
          throw new Error("Main PSBT signing cancelled or failed.");
        }

        let signedRbfPsbt: string | null = null;
        if (rbfPsbtBase64) {
          const rbfSigningResult = await signPsbt(rbfPsbtBase64);
          signedRbfPsbt = rbfSigningResult?.signedPsbtBase64 ?? null;
          if (!signedRbfPsbt) {
          }
        }

        // 3. Confirm PSBT via API
        console.log("Step 3: Confirming signed PSBT via API...");
        dispatchSwap({ type: "SWAP_STEP", step: "confirming" });
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
          signedRbfPsbtBase64: signedRbfPsbt ?? undefined,
          rbfProtection: !!signedRbfPsbt,
        };
        // *** Use API client function ***
        const confirmResult = await confirmPsbtViaApi(confirmParams);

        // Define a basic interface for expected response structure
        interface SwapConfirmationResult {
          txid?: string;
          rbfProtection?: {
            fundsPreparationTxId?: string;
          };
        }

        // Use proper typing instead of 'any'
        const finalTxId =
          (confirmResult as SwapConfirmationResult)?.txid ||
          (confirmResult as SwapConfirmationResult)?.rbfProtection
            ?.fundsPreparationTxId;
        if (!finalTxId) {
          throw new Error(
            `Confirmation failed or transaction ID missing. Response: ${JSON.stringify(confirmResult)}`,
          );
        }
        console.log("Swap successful! Transaction ID:", finalTxId);
        console.log(
          "Swap successful! Setting success state and preventing further fetches",
        );
        dispatchSwap({ type: "SWAP_SUCCESS", txId: finalTxId });

        // Prevent further operations
        isThrottledRef.current = true;

        // This is important to prevent further fetches
        setTimeout(() => {
          // Do this in next tick to ensure state is updated
          quoteKeyRef.current = "completed-swap";
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
          : "An unknown error occurred during the swap.";

      // Store the error message for use in the finally block
      errorMessageRef.current = errorMessage;

      // Handle fee rate errors specifically
      if (
        errorMessage.includes("Network fee rate not high enough") ||
        errorMessage.includes("fee rate")
      ) {
        console.log(
          "Fee rate too low for network conditions, attempting retry with higher fee",
        );

        // First, notify the user that we're retrying
        dispatchSwap({
          type: "SET_GENERIC_ERROR",
          error:
            "Fee rate too low, automatically retrying with a higher fee rate...",
        });

        try {
          // Calculate a higher fee rate for the retry (use fastestFee + 30% extra)
          // If recommendedFeeRates is not available, use a fixed high value
          const highPriorityFeeRate = recommendedFeeRates
            ? Math.ceil(recommendedFeeRates.fastestFee * 1.3) // 30% more than fastest
            : 35; // fallback high value

          console.log(
            `Retrying with higher fee rate: ${highPriorityFeeRate} sat/vB (was ${psbtParams.feeRate} sat/vB)`,
          );

          const retryParams = {
            ...psbtParams,
            feeRate: highPriorityFeeRate,
          };

          // Removed redundant log as we already logged the fee rate
          const psbtResult = await getPsbtFromApi(retryParams);

          const mainPsbtBase64 =
            (psbtResult as unknown as { psbtBase64?: string; psbt?: string })
              ?.psbtBase64 ||
            (psbtResult as unknown as { psbtBase64?: string; psbt?: string })
              ?.psbt;
          const swapId = (psbtResult as unknown as { swapId?: string })?.swapId;
          const rbfPsbtBase64 = (
            psbtResult as unknown as { rbfProtected?: { base64?: string } }
          )?.rbfProtected?.base64;

          if (!mainPsbtBase64 || !swapId) {
            throw new Error(
              `Invalid PSBT data received from API: ${JSON.stringify(psbtResult)}`,
            );
          }

          // Continue with the original flow using the new PSBT
          // 👍 Successfully created PSBT with higher fee rate, continue with standard flow
          dispatchSwap({ type: "SWAP_STEP", step: "signing" });
          const mainSigningResult = await signPsbt(mainPsbtBase64);
          const signedMainPsbt = mainSigningResult?.signedPsbtBase64;
          if (!signedMainPsbt) {
            throw new Error("Main PSBT signing cancelled or failed.");
          }

          let signedRbfPsbt: string | null = null;
          if (rbfPsbtBase64) {
            const rbfSigningResult = await signPsbt(rbfPsbtBase64);
            signedRbfPsbt = rbfSigningResult?.signedPsbtBase64 ?? null;
          }

          // 3. Confirm PSBT via API with higher fee rate PSBT
          // Confirming the PSBT with higher fee
          dispatchSwap({ type: "SWAP_STEP", step: "confirming" });
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
            signedRbfPsbtBase64: signedRbfPsbt ?? undefined,
            rbfProtection: !!signedRbfPsbt,
          };

          // Confirm with the new PSBT
          const confirmResult = await confirmPsbtViaApi(confirmParams);

          // Define a basic interface for expected response structure
          interface SwapConfirmationResult {
            txid?: string;
            rbfProtection?: {
              fundsPreparationTxId?: string;
            };
          }

          // Use proper typing instead of 'any'
          const finalTxId =
            (confirmResult as SwapConfirmationResult)?.txid ||
            (confirmResult as SwapConfirmationResult)?.rbfProtection
              ?.fundsPreparationTxId;
          if (!finalTxId) {
            throw new Error(
              `Confirmation failed or transaction ID missing. Response: ${JSON.stringify(confirmResult)}`,
            );
          }

          console.log(
            `Transaction successful with higher fee rate! TxID: ${finalTxId}`,
          );
          dispatchSwap({ type: "SWAP_SUCCESS", txId: finalTxId });

          // Prevent further operations
          isThrottledRef.current = true;

          // This is important to prevent further fetches
          setTimeout(() => {
            // Do this in next tick to ensure state is updated
            quoteKeyRef.current = "completed-swap";
          }, 0);

          // Exit the catch block - we've successfully recovered from the error
          return;
        } catch (retryError) {
          // If the retry also fails, show a more specific error
          console.error("Transaction failed even with higher fee rate");
          const retryErrorMessage =
            retryError instanceof Error
              ? retryError.message
              : "Failed to retry with higher fee rate";

          dispatchSwap({
            type: "SET_GENERIC_ERROR",
            error: `Transaction failed even with a higher fee rate. The network may be congested. Please try again later. (${retryErrorMessage})`,
          });
          dispatchSwap({
            type: "SWAP_ERROR",
            error: `Transaction failed even with a higher fee rate. The network may be congested. Please try again later. (${retryErrorMessage})`,
          });
        }
      }
      // Handle other specific errors
      else if (
        errorMessage.includes("Quote expired. Please, fetch again.") ||
        (error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code?: string }).code === "QUOTE_EXPIRED")
      ) {
        // Quote expired error
        dispatchSwap({ type: "QUOTE_EXPIRED" });
        dispatchSwap({
          type: "SET_GENERIC_ERROR",
          error: "Quote expired. Please fetch a new one.",
        });
        dispatchSwap({
          type: "SWAP_ERROR",
          error: "Quote expired. Please fetch a new one.",
        });
      } else if (
        errorMessage.includes("User canceled the request") ||
        errorMessage.includes("User canceled")
      ) {
        // User cancelled signing - we need to reset the swap state more thoroughly
        console.log(
          "User canceled request detected - resetting swap state completely",
        );

        // IMPORTANT: We use a full reset instead of individual state updates
        // This ensures we clear ALL state flags at once, including isQuoteLoading
        dispatchSwap({ type: "RESET_SWAP" });

        // Explicitly set the swap step to idle as well to ensure the UI is reset correctly
        // This handles edge cases where RESET_SWAP might not fully propagate immediately
        dispatchSwap({ type: "SWAP_STEP", step: "idle" });

        // Then set the error message for the user (after reset)
        dispatchSwap({
          type: "SET_GENERIC_ERROR",
          error: "User canceled the request",
        });
      } else {
        // Other swap errors
        dispatchSwap({ type: "SET_GENERIC_ERROR", error: errorMessage });
        dispatchSwap({ type: "SWAP_ERROR", error: errorMessage });
      }
    } finally {
      // We NEVER reset or change the state if a swap was successful (has txId)
      if (swapState.txId) {
        console.log("Swap has transaction ID - preserving success state");
        if (swapState.swapStep !== "success") {
          console.log("Ensuring swap step is set to success");
          dispatchSwap({ type: "SWAP_SUCCESS", txId: swapState.txId });
        }
        return;
      }

      // We need to handle different final states appropriately
      if (swapState.swapStep === "success" && swapState.txId) {
        // Success case - keep the success state and txId
        console.log("Transaction successful, preserving success state");
      } else if (errorMessageRef.current?.includes("User canceled")) {
        // User canceled case - ensure we reset to a fully interactive state
        console.log(
          "User canceled operation, ensuring UI is reset to interactive state",
        );

        // Set to idle AND explicitly ensure loading state is cleared
        // This is crucial to ensure the button becomes clickable again
        dispatchSwap({ type: "SWAP_STEP", step: "idle" });
      } else if (quoteExpired) {
        // Quote expired case - keep expired state to prompt for new quote
        console.log("Quote expired, preserving expired state");
      } else if (swapState.swapStep !== "success") {
        // All other non-success cases - reset to idle state
        console.log(
          "Resetting swap state to idle after non-successful operation",
        );
        dispatchSwap({ type: "SWAP_STEP", step: "idle" });
      }
    }
  };

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
                } catch (error) {
                  console.error("Error formatting rune balance:", error);
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
