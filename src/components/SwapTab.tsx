import React, { useState, useEffect, Fragment, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import styles from './SwapInterface.module.css';
import debounce from 'lodash.debounce';
import { useDebounce } from 'use-debounce';
import { type QuoteResponse, type RuneOrder, type GetPSBTParams, type ConfirmPSBTParams } from 'satsterminal-sdk';
import { Asset, BTC_ASSET } from '@/types/common';
import type { Rune } from '@/types/satsTerminal.ts';
import { 
  fetchRunesFromApi,
  fetchPopularFromApi,
  fetchQuoteFromApi,
  getPsbtFromApi,
  confirmPsbtViaApi,
  fetchBtcBalanceFromApi,
  fetchRuneBalancesFromApi,
  fetchRuneInfoFromApi,
  fetchRuneMarketFromApi
} from '@/lib/apiClient';
import { type RuneBalance as OrdiscanRuneBalance, type RuneInfo as OrdiscanRuneInfo, type RuneMarketInfo as OrdiscanRuneMarketInfo } from '@/types/ordiscan';

// Mock address for fetching quotes when disconnected
const MOCK_ADDRESS = '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo';

interface SwapTabProps {
  connected: boolean;
  address: string | null;
  paymentAddress: string | null;
  publicKey: string | null;
  paymentPublicKey: string | null;
  signPsbt: (tx: string, finalize?: boolean, broadcast?: boolean) => Promise<{ signedPsbtHex?: string; signedPsbtBase64?: string; txId?: string; } | undefined>;
  btcPriceUsd: number | undefined;
  isBtcPriceLoading: boolean;
  btcPriceError: Error | null;
}

export function SwapTab({ connected, address, paymentAddress, publicKey, paymentPublicKey, signPsbt, btcPriceUsd, isBtcPriceLoading, btcPriceError }: SwapTabProps) {
  // State for input/output amounts
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');

  // State for selected assets
  const [assetIn, setAssetIn] = useState<Asset>(BTC_ASSET);
  const [assetOut, setAssetOut] = useState<Asset | null>(null);

  // State for rune fetching/searching
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPopularLoading, setIsPopularLoading] = useState(true);
  const [popularRunes, setPopularRunes] = useState<Asset[]>([]);
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [popularError, setPopularError] = useState<string | null>(null);

  // State for quote fetching
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteExpired, setQuoteExpired] = useState(false);

  // State for calculated prices
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [inputUsdValue, setInputUsdValue] = useState<string | null>(null);
  const [outputUsdValue, setOutputUsdValue] = useState<string | null>(null);

  // State for swap process
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStep, setSwapStep] = useState<'idle' | 'getting_psbt' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null); // Store final transaction ID

  // State for loading dots animation
  const [loadingDots, setLoadingDots] = useState('.');

  // Ordiscan Balance Queries 
  const {
    data: btcBalanceSats,
    isLoading: isBtcBalanceLoading,
    error: btcBalanceError,
  } = useQuery<number, Error>({
    queryKey: ['btcBalance', paymentAddress], // Include address in key
    queryFn: () => fetchBtcBalanceFromApi(paymentAddress!), // Use API function
    enabled: !!connected && !!paymentAddress, // Only run query if connected and address exists
    staleTime: 30000, // Consider balance stale after 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  const {
    data: runeBalances,
    isLoading: isRuneBalancesLoading,
    error: runeBalancesError,
  } = useQuery<OrdiscanRuneBalance[], Error>({
    queryKey: ['runeBalancesApi', address],
    queryFn: () => fetchRuneBalancesFromApi(address!), // Use API function
    enabled: !!connected && !!address, // Only run query if connected and address exists
    staleTime: 30000, // Consider balances stale after 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  // Query for Rune Info (for balance)
  const {
    data: swapRuneInfo, 
    isLoading: isSwapRuneInfoLoading,
    error: swapRuneInfoError,
  } = useQuery<OrdiscanRuneInfo | null, Error>({
    queryKey: ['runeInfoApi', assetIn?.name?.replace(/•/g, '')],
    queryFn: () => assetIn && !assetIn.isBTC && assetIn.name ? fetchRuneInfoFromApi(assetIn.name) : Promise.resolve(null), // Use API function
    enabled: !!assetIn && !assetIn.isBTC && !!assetIn.name, // Only fetch for non-BTC assets
    staleTime: Infinity,
  });

  // Query for Input Rune Market Info (for swap tab)
  const {
    data: inputRuneMarketInfo,
  } = useQuery<OrdiscanRuneMarketInfo | null, Error>({
    queryKey: ['runeMarketApi', assetIn?.name],
    queryFn: () => assetIn && !assetIn.isBTC ? fetchRuneMarketFromApi(assetIn.name) : Promise.resolve(null),
    enabled: !!assetIn && !assetIn.isBTC,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Query for Output Rune Market Info (for swap tab)
  const {
    data: outputRuneMarketInfo,
  } = useQuery<OrdiscanRuneMarketInfo | null, Error>({
    queryKey: ['runeMarketApi', assetOut?.name],
    queryFn: () => assetOut && !assetOut.isBTC ? fetchRuneMarketFromApi(assetOut.name) : Promise.resolve(null),
    enabled: !!assetOut && !assetOut.isBTC,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Effect for loading dots animation
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isQuoteLoading || isBtcPriceLoading || isSwapping) { // Added isSwapping
      intervalId = setInterval(() => {
        setLoadingDots(dots => dots.length < 3 ? dots + '.' : '.');
      }, 500); // Update every 500ms
    } else {
      setLoadingDots('.'); // Reset when not loading
    }

    // Cleanup function to clear interval
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isQuoteLoading, isBtcPriceLoading, isSwapping]); // Added isSwapping

  // Fetch popular runes on mount using API
  useEffect(() => {
    const fetchPopular = async () => {
      setIsPopularLoading(true);
      setPopularError(null);
      setPopularRunes([]);
      try {
        // *** Use the new API fetch function ***
        const response = await fetchPopularFromApi(); 
        if (!Array.isArray(response)) {
          setPopularRunes([]);
        } else {
          const mappedRunes: Asset[] = response.map((collection: Record<string, unknown>) => ({
            id: collection?.rune as string || `unknown_${Math.random()}`,
            name: ((collection?.etching as Record<string, unknown>)?.runeName as string) || collection?.rune as string || 'Unknown',
            imageURI: collection?.icon_content_url_data as string || collection?.imageURI as string,
            isBTC: false,
          }));
          setPopularRunes(mappedRunes);
          if (assetIn.isBTC && !assetOut && mappedRunes.length > 0) {
            setAssetOut(mappedRunes[0]);
          }
        }
      } catch (error) {
        setPopularError(error instanceof Error ? error.message : 'Failed to fetch popular runes');
        setPopularRunes([]);
      } finally {
        setIsPopularLoading(false);
      }
    };
    fetchPopular();
  // Ensure assetOut is included as a dependency to reset correctly
  }, [assetIn.isBTC, assetOut, setAssetOut, setIsPopularLoading, setPopularError, setPopularRunes]); 

  // Create a debounced search function - MEMOIZED
  const debouncedSearch = useMemo(() => 
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
        const mappedResults: Asset[] = results.map(rune => ({
          id: rune.id, 
          name: rune.name,
          imageURI: rune.imageURI,
          isBTC: false,
        }));
        setSearchResults(mappedResults); // Store as Asset[]
      } catch (error: unknown) {
        // Keep actual error logging
        console.error("[SwapTab] Error searching runes:", error);
        setSearchError(error instanceof Error ? error.message : 'Failed to search');
        setSearchResults([]); // Clear results on error
      } finally {
        setIsSearching(false);
      }
    }, 300),
  []); // <-- Empty dependency array ensures it's created only once

  // Clean up the debounced function on component unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(true); // Indicate searching immediately
    debouncedSearch(query);
  };

  // Determine which runes to display (use Asset type)
  const availableRunes = searchQuery.trim() ? searchResults : popularRunes;
  const isLoadingRunes = searchQuery.trim() ? isSearching : isPopularLoading;
  const currentRunesError = searchQuery.trim() ? searchError : popularError;

  // Define debounced value for input amount
  // Correctly use the imported useDebounce hook - extract the first element
  const [debouncedInputAmount] = useDebounce(inputAmount ? parseFloat(inputAmount) : 0, 500); 

  // --- Asset Selection Logic ---
  const handleSelectAssetIn = (selectedAsset: Asset) => {
    // Prevent selecting the same asset for both input and output
    if (assetOut && selectedAsset.id === assetOut.id) return;

    setAssetIn(selectedAsset);
    // If selected asset is BTC, ensure output is a Rune
    if (selectedAsset.isBTC) {
      if (!assetOut || assetOut.isBTC) {
        // Set to first available rune or null if none
        setAssetOut(popularRunes.length > 0 ? popularRunes[0] : null);
      }
    } else {
      // If selected asset is a Rune, ensure output is BTC
      setAssetOut(BTC_ASSET);
    }
    // Clear amounts and quote when assets change
    setInputAmount('');
    setOutputAmount('');
    setQuote(null);
    setQuoteError(null);
    setExchangeRate(null);
    setInputUsdValue(null);
    setOutputUsdValue(null);
    setQuoteExpired(false); // Reset quote expired state
  };

  const handleSelectAssetOut = (selectedAsset: Asset) => {
    // Prevent selecting the same asset for both input and output
    if (assetIn && selectedAsset.id === assetIn.id) return;

    const previousAssetIn = assetIn; // Store previous input asset

    setAssetOut(selectedAsset);

    // If the NEW output asset is BTC, ensure input is a Rune
    if (selectedAsset.isBTC) {
      if (!previousAssetIn || previousAssetIn.isBTC) {
        // Input was BTC (or null), now must be Rune
        setAssetIn(popularRunes.length > 0 ? popularRunes[0] : BTC_ASSET); // Fallback needed if no popular runes
        // Since input asset type changed, reset amounts
        setInputAmount('');
        setOutputAmount('');
      }
      // else: Input was already a Rune, keep it. Amount reset handled below.
    } else {
      // If the NEW output asset is a Rune, ensure input is BTC
      setAssetIn(BTC_ASSET);
      // Check if the input asset type *actually* changed
      if (!previousAssetIn || !previousAssetIn.isBTC) {
         // Input was Rune (or null), now is BTC. Reset both amounts.
         setInputAmount('');
         setOutputAmount('');
      } else {
         // Input was already BTC and remains BTC. Keep inputAmount, just reset output.
         setOutputAmount('');
      }
    }

    // Always clear quote and related state when output asset changes
    setQuote(null);
    setQuoteError(null);
    setExchangeRate(null);
    setInputUsdValue(null);
    setOutputUsdValue(null);
    setQuoteExpired(false); // Reset quote expired state
  };

  // --- Swap Direction Logic ---
  const handleSwapDirection = () => {
    // Swap assets
    const tempAsset = assetIn;
    setAssetIn(assetOut ?? BTC_ASSET); // Fallback if assetOut is null
    setAssetOut(tempAsset);

    // Swap amounts (if outputAmount has a value)
    const tempAmount = inputAmount;
    setInputAmount(outputAmount); // Set input to previous output
    setOutputAmount(tempAmount); // Reset output (will be recalculated by quote)

    // Clear quote and related state
    setQuote(null);
    setQuoteError(null);
    setExchangeRate(null);
    setInputUsdValue(null);
    setOutputUsdValue(null);
    // Reset swap process state
    setIsSwapping(false);
    setSwapStep('idle');
    setSwapError(null);
    setTxId(null);
    setQuoteExpired(false); // Reset quote expired state
  };

  // --- Quote & Price Calculation ---
  // Memoized quote fetching using API
  const handleFetchQuote = useCallback(() => {
    setQuoteExpired(false);
    const fetchQuoteAsync = async () => {
      const isBtcToRune = assetIn?.isBTC;
      const runeAsset = isBtcToRune ? assetOut : assetIn;
      const currentInputAmount = parseFloat(inputAmount); // Read latest input from ref

      if (!assetIn || !assetOut || !runeAsset || runeAsset.isBTC || currentInputAmount <= 0) return;
      
      setIsQuoteLoading(true);
      setQuote(null); // Clear previous quote
      setQuoteError(null);
      setExchangeRate(null); // Clear previous rate

      // Use MOCK_ADDRESS if no wallet is connected to allow quote fetching
      const effectiveAddress = address || MOCK_ADDRESS;
      if (!effectiveAddress) { // Should theoretically never happen with MOCK_ADDRESS fallback
           setQuoteError("Internal error: Missing address for quote.");
           setIsQuoteLoading(false);
           return;
      }

      try {
        const params = {
          btcAmount: currentInputAmount, 
          runeName: runeAsset.name,
          address: effectiveAddress,
          sell: !isBtcToRune,
          // TODO: Add other params like marketplace, rbfProtection if needed
        };

        // *** Use API client function ***
        const quoteResponse = await fetchQuoteFromApi(params); 
        setQuote(quoteResponse);
        
        let calculatedOutputAmount = '';
        let calculatedRate = null;

        if (quoteResponse) {
          const inputVal = currentInputAmount;
          let outputVal = 0;
          let btcValue = 0;
          let runeValue = 0;

          try {
            if (isBtcToRune) {
              outputVal = parseFloat(quoteResponse.totalFormattedAmount || '0');
              btcValue = inputVal;
              runeValue = outputVal;
              calculatedOutputAmount = outputVal.toLocaleString(undefined, {});
            } else {
              outputVal = parseFloat(quoteResponse.totalPrice || '0');
              runeValue = inputVal;
              btcValue = outputVal;
              calculatedOutputAmount = outputVal.toLocaleString(undefined, { maximumFractionDigits: 8 });
            }

            if (btcValue > 0 && runeValue > 0 && btcPriceUsd) {
               const btcUsdAmount = (isBtcToRune ? btcValue : btcValue) * btcPriceUsd;
               const pricePerRune = btcUsdAmount / runeValue;
               calculatedRate = `${pricePerRune.toLocaleString(undefined, { 
                  style: 'currency', 
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })} per ${runeAsset.name}`;
            }
            setExchangeRate(calculatedRate);

          } catch (e) {
            console.error("Error parsing quote amounts:", e);
            calculatedOutputAmount = 'Error';
            setExchangeRate('Error calculating rate');
          }
        }
        setOutputAmount(calculatedOutputAmount);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quote';
        if (errorMessage.includes('Insufficient liquidity') || errorMessage.includes('not found')) {
           setQuoteError(`Could not find a quote for this pair/amount.`);
        } else {
           setQuoteError(`Quote Error: ${errorMessage}`);
        }
        setQuote(null);
        setOutputAmount('');
        setExchangeRate(null);
      } finally {
        setIsQuoteLoading(false);
      }
    };
    fetchQuoteAsync();
  }, [assetIn, assetOut, inputAmount, address, btcPriceUsd,
      setIsQuoteLoading, setQuote, setQuoteError, setExchangeRate, setOutputAmount, setQuoteExpired
  ]);

  // Effect to call the memoized fetchQuote when debounced amount or assets change
  useEffect(() => {
    // Fetch quote only if amount and assets are valid
    const runeAsset = assetIn?.isBTC ? assetOut : assetIn;
    if (debouncedInputAmount > 0 && assetIn && assetOut && runeAsset && !runeAsset.isBTC) {
      handleFetchQuote();
    } else {
      // Reset quote state if conditions aren't met
      setQuote(null);
      // Don't set loading to false here, handleFetchQuote does it
      setQuoteError(null);
      setOutputAmount('');
      setExchangeRate(null);
      setInputUsdValue(null);
      setOutputUsdValue(null);
      setQuoteExpired(false); // Reset quote expired state here too
    }
  }, [debouncedInputAmount, assetIn, assetOut, handleFetchQuote]);

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
      } else if (!assetIn.isBTC && quote && quote.totalPrice && btcPriceUsd && !isQuoteLoading) {
          // Fallback to quote calculation if market info not available
          const btcPerRune = (quote.totalPrice && quote.totalFormattedAmount && parseFloat(quote.totalFormattedAmount) > 0)
              ? parseFloat(quote.totalPrice) / parseFloat(quote.totalFormattedAmount)
              : 0;

          if (btcPerRune > 0) {
              inputUsdVal = amountNum * btcPerRune * btcPriceUsd;
          }
      }

      // Calculate output USD value
      let outputUsdVal: number | null = null;
      if (outputAmount && assetOut) {
        // Remove commas from outputAmount before parsing
        const sanitizedOutputAmount = outputAmount.replace(/,/g, '');
        const outputAmountNum = parseFloat(sanitizedOutputAmount);
        
        if (!isNaN(outputAmountNum) && outputAmountNum > 0) {
          if (assetOut.isBTC && btcPriceUsd) {
            // Output is BTC
            outputUsdVal = outputAmountNum * btcPriceUsd;
          } else if (!assetOut.isBTC && outputRuneMarketInfo) {
            // Output is Rune, use market info
            outputUsdVal = outputAmountNum * outputRuneMarketInfo.price_in_usd;
          } else if (!assetOut.isBTC && quote && quote.totalPrice && btcPriceUsd && !isQuoteLoading) {
            // Fallback to quote calculation if market info not available
            const btcPerRune = (quote.totalPrice && quote.totalFormattedAmount && parseFloat(quote.totalFormattedAmount) > 0)
                ? parseFloat(quote.totalPrice) / parseFloat(quote.totalFormattedAmount)
                : 0;

            if (btcPerRune > 0) {
                outputUsdVal = outputAmountNum * btcPerRune * btcPriceUsd;
            }
          }
        }
      }

      // Format and set input USD value
      if (inputUsdVal !== null && inputUsdVal > 0) {
        setInputUsdValue(inputUsdVal.toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }));
      } else {
        setInputUsdValue(null);
      }

      // Format and set output USD value
      if (outputUsdVal !== null && outputUsdVal > 0) {
        setOutputUsdValue(outputUsdVal.toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }));
      } else {
        setOutputUsdValue(null);
      }
    } catch (e) {
      console.error("Failed to calculate USD values:", e);
      setInputUsdValue(null);
      setOutputUsdValue(null);
    }
  }, [inputAmount, outputAmount, assetIn, assetOut, btcPriceUsd, isBtcPriceLoading, btcPriceError, 
      quote, isQuoteLoading, inputRuneMarketInfo, outputRuneMarketInfo]);

  // Function to handle the entire swap process using API
  const handleSwap = async () => {
    const isBtcToRune = assetIn?.isBTC;
    const runeAsset = isBtcToRune ? assetOut : assetIn;

    // Double-check required data
    if (!connected || !address || !publicKey || !paymentAddress || !paymentPublicKey || !quote || !assetIn || !assetOut || !runeAsset || runeAsset.isBTC) {
      setSwapError("Missing connection details, assets, or quote. Please connect wallet and ensure quote is fetched.");
      setSwapStep('error');
      return;
    }

    setIsSwapping(true);
    setSwapError(null);
    setTxId(null);
    setQuoteExpired(false); // Ensure reset before attempting swap

    try {
      // 1. Get PSBT via API
      setSwapStep('getting_psbt');
      const orders: RuneOrder[] = quote.selectedOrders || [];
      const psbtParams: GetPSBTParams = {
        orders: orders, 
        address: address, 
        publicKey: publicKey, 
        paymentAddress: paymentAddress, 
        paymentPublicKey: paymentPublicKey,
        runeName: runeAsset.name, 
        sell: !isBtcToRune,
        // TODO: Add feeRate, slippage, rbfProtection from UI state later
      };
      // *** Use API client function ***
      const psbtResult = await getPsbtFromApi(psbtParams); 

      const mainPsbtBase64 = (psbtResult as unknown as { psbtBase64?: string, psbt?: string })?.psbtBase64 
                           || (psbtResult as unknown as { psbtBase64?: string, psbt?: string })?.psbt;
      const swapId = (psbtResult as unknown as { swapId?: string })?.swapId;
      const rbfPsbtBase64 = (psbtResult as unknown as { rbfProtected?: { base64?: string } })?.rbfProtected?.base64;

      if (!mainPsbtBase64 || !swapId) {
        throw new Error(`Invalid PSBT data received from API: ${JSON.stringify(psbtResult)}`);
      }

      // 2. Sign PSBT(s) - Remains client-side via LaserEyes
      setSwapStep('signing');
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
              console.warn("RBF PSBT signing cancelled or failed. Proceeding without RBF confirmation might be possible depending on API.");
          }
      }

      // 3. Confirm PSBT via API
      setSwapStep('confirming');
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
      const finalTxId = (confirmResult as SwapConfirmationResult)?.txid || 
                        (confirmResult as SwapConfirmationResult)?.rbfProtection?.fundsPreparationTxId;
      if (!finalTxId) {
          throw new Error(`Confirmation failed or transaction ID missing. Response: ${JSON.stringify(confirmResult)}`);
      }
      setTxId(finalTxId);
      setSwapStep('success');

    } catch (error: unknown) {
      console.error("Swap failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during the swap.";

      // Check for specific errors
      if (errorMessage.includes("Quote expired. Please, fetch again.") || 
          (error && typeof error === 'object' && 'code' in error && 
           (error as { code?: string }).code === 'QUOTE_EXPIRED')) {
        // Quote expired error
        setQuoteExpired(true);
        setSwapError("Quote expired. Please fetch a new one."); // Set error message
        setSwapStep('idle'); // Reset step to allow button click for re-fetch
      } else if (errorMessage.includes("User canceled the request")) {
        // User cancelled signing
        setSwapError(errorMessage); // Keep the error message
        setSwapStep('idle'); // Reset step to allow retry, button remains active
      } else {
        // Other swap errors
        setQuoteExpired(false); // Ensure quote expired state is reset
        setSwapError(errorMessage);
        setSwapStep('error'); // Set to error state, button might disable
      }
    } finally {
      // Setting isSwapping false ONLY if not in a state that requires user action (like quote expired)
      // This ensures the button text/state reflects the quoteExpired status correctly.
      if (!quoteExpired) {
         setIsSwapping(false); // Only set isSwapping false if it wasn't a quote expiry error
      }
      // If quoteExpired is true, isSwapping should remain false anyway because we didn't set it true
      // or we exited the try block before confirming. Let's ensure it's false in finally.
       setIsSwapping(false); // Ensure isSwapping is always false after attempt
    }
  };

  // Dynamic swap button text
  const getSwapButtonText = () => {
    if (quoteExpired) return 'Fetch New Quote'; // Check first
    if (!connected) return 'Connect Wallet';
    if (isQuoteLoading) return `Fetching Quote${loadingDots}`;
    if (!assetIn || !assetOut) return 'Select Assets';
    if (!inputAmount || parseFloat(inputAmount) <= 0) return 'Enter Amount';
    // If quote expired, we already returned. If quoteError exists BUT it wasn't expiry, show error.
    if (quoteError && !quoteExpired) return 'Quote Error';
    // Show loading quote only if not expired and amount > 0
    if (!quote && !quoteError && !quoteExpired && debouncedInputAmount > 0) return `Getting Quote${loadingDots}`;
    if (!quote && !quoteExpired) return 'Get Quote'; // Before debounce or if amount is 0
    if (isSwapping) { // isSwapping is false if quoteExpired is true due to finally block logic
      switch (swapStep) {
        case 'getting_psbt': return `Generating Transaction${loadingDots}`;
        case 'signing': return `Waiting for Signature${loadingDots}`;
        case 'confirming': return `Confirming Swap${loadingDots}`;
        default: return `Processing Swap${loadingDots}`;
      }
    }
    if (swapStep === 'success' && txId) return 'Swap Successful!';
    // Show 'Swap Failed' only if it's an error state AND not a quote expiry requiring action
    if (swapStep === 'error' && !quoteExpired) return 'Swap Failed';
    // If idle after cancellation, show Swap. If idle after quote expiry, show Fetch New Quote (handled above)
    return 'Swap';
  };

  // --- Asset Selector Component (Simplified Inline) ---
  const renderAssetSelector = (
      value: Asset | null,
      onChange: (asset: Asset) => void,
      disabled: boolean,
      purpose: 'selectRune' | 'selectBtcOrRune',
      otherAsset: Asset | null,
      availableRunes: Asset[],
      isLoadingRunes: boolean,
      currentRunesError: string | null,
      searchQuery: string,
      handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => {
    const runesToShow = purpose === 'selectBtcOrRune' ? [BTC_ASSET, ...availableRunes] : availableRunes;
    // Filter out the other selected asset if necessary
    const filteredRunes = runesToShow.filter(rune => !otherAsset || rune.id !== otherAsset.id);

    return (
      <div className={styles.listboxContainer}>
          <Listbox value={value} onChange={onChange} disabled={disabled || isLoadingRunes}>
              <div className={styles.listboxRelative}>
                  <Listbox.Button className={styles.listboxButton}>
                      <span className={styles.listboxButtonText}>
                          {value?.imageURI && (
                              <Image
                                  src={value.imageURI}
                                  alt={`${value.name} logo`}
                                  className={styles.assetButtonImage}
                                  width={24}
                                  height={24}
                                  aria-hidden="true"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target) {
                                      target.style.display = 'none';
                                    }
                                  }}
                              />
                          )}
                          {isLoadingRunes && purpose === 'selectRune' ? 'Loading...' : value ? value.name : 'Select Asset'}
                      </span>
                      <span className={styles.listboxButtonIconContainer}>
                          <ChevronUpDownIcon className={styles.listboxButtonIcon} aria-hidden="true" />
                      </span>
                  </Listbox.Button>
                  <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                  >
                      <Listbox.Options className={styles.listboxOptions}>
                          {purpose === 'selectBtcOrRune' && (
                             <Listbox.Option
                                  key={BTC_ASSET.id}
                                  className={({ active }) =>
                                      `${styles.listboxOption} ${ active ? styles.listboxOptionActive : styles.listboxOptionInactive }`
                                  }
                                  value={BTC_ASSET}
                                  disabled={BTC_ASSET.id === otherAsset?.id}
                             >
                                  {({ selected }) => (
                                       <>
                                          <span className={styles.runeOptionContent}> {/* Use rune option style */}
                                              {BTC_ASSET.imageURI && (
                                                  <Image 
                                                    src={BTC_ASSET.imageURI} 
                                                    alt="" 
                                                    className={styles.runeImage} 
                                                    width={24}
                                                    height={24}
                                                    aria-hidden="true" 
                                                  />
                                              )}
                                              <span className={`${styles.listboxOptionText} ${ selected ? styles.listboxOptionTextSelected : styles.listboxOptionTextUnselected }`}>
                                                  {BTC_ASSET.name}
                                              </span>
                                          </span>
                                          {selected && (
                                              <span className={styles.listboxOptionCheckContainer}>
                                                  <CheckIcon className={styles.listboxOptionCheckIcon} aria-hidden="true" />
                                              </span>
                                          )}
                                      </>
                                  )}
                             </Listbox.Option>
                          )}

                          <div className={styles.searchContainer}>
                              <div className={styles.searchWrapper}>
                                  <Image 
                                      src="/icons/magnifying_glass-0.png" 
                                      alt="Search" 
                                      className={styles.searchIconEmbedded}
                                      width={16}
                                      height={16}
                                  />
                                  <input
                                      type="text"
                                      placeholder="Search runes..."
                                      value={searchQuery}
                                      onChange={handleSearchChange}
                                      className={styles.searchInput}
                                  />
                              </div>
                          </div>

                          {isLoadingRunes && <div className={styles.listboxLoadingOrEmpty}>Loading Runes...</div>}
                          {!isLoadingRunes && currentRunesError && (
                            <div className={`${styles.listboxError} ${styles.messageWithIcon}`}>
                              <Image 
                                src="/icons/msg_error-0.png" 
                                alt="Error" 
                                className={styles.messageIcon}
                                width={16}
                                height={16}
                              />
                              <span>{currentRunesError}</span>
                            </div>
                          )}
                          {!isLoadingRunes && !currentRunesError && availableRunes.length === 0 && (
                               <div className={styles.listboxLoadingOrEmpty}>
                                  {searchQuery ? 'No matching runes found' : (purpose === 'selectBtcOrRune' ? 'No other runes available' : 'No runes available')}
                               </div>
                          )}

                          {filteredRunes
                              .filter(rune => rune.id !== otherAsset?.id)
                              .map((rune) => (
                              <Listbox.Option
                                  key={rune.id}
                                  className={({ active }) =>
                                      `${styles.listboxOption} ${ active ? styles.listboxOptionActive : styles.listboxOptionInactive }`
                                  }
                                  value={rune}
                              >
                                  {({ selected }) => (
                                      <>
                                          <span className={styles.runeOptionContent}> {/* Use rune option style */}
                                              {rune.imageURI && (
                                                  <Image
                                                      src={rune.imageURI}
                                                      alt=""
                                                      className={styles.runeImage}
                                                      width={24}
                                                      height={24}
                                                      aria-hidden="true"
                                                      onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        if (target) {
                                                          target.style.display = 'none';
                                                        }
                                                      }}
                                                  />
                                              )}
                                              <span className={`${styles.listboxOptionText} ${ selected ? styles.listboxOptionTextSelected : styles.listboxOptionTextUnselected }`}>
                                                  {rune.name}
                                              </span>
                                          </span>
                                          {selected && (
                                              <span className={styles.listboxOptionCheckContainer}>
                                                  <CheckIcon className={styles.listboxOptionCheckIcon} aria-hidden="true" />
                                              </span>
                                          )}
                                      </>
                                  )}
                              </Listbox.Option>
                          ))}
                      </Listbox.Options>
                  </Transition>
              </div>
          </Listbox>
      </div>
    );
  };

  // --- Find specific rune balance --- (Helper Function)
  const getSpecificRuneBalance = (runeName: string | undefined): string | null => {
    if (!runeName || !runeBalances) return null;
    // Ordiscan returns names without spacers, so compare without them
    const formattedRuneName = runeName.replace(/•/g, '');
    const found = runeBalances?.find(rb => rb.name === formattedRuneName);
    return found ? found.balance : '0'; // Return '0' if not found, assuming 0 balance
  };

  // Reset swap state when inputs/wallet change significantly
  useEffect(() => {
    setIsSwapping(false);
    setSwapStep('idle');
    setSwapError(null);
    setTxId(null);
    // Don't reset amounts/assets here, handled by selection logic
  }, [inputAmount, assetIn, assetOut, address, connected]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Swap</h2>

      {/* Input Area */}
      <div className={styles.inputArea}>
        <div className={styles.inputHeader}>
          <label htmlFor="input-amount" className={styles.inputLabel}>You Pay</label>
          {connected && assetIn && (
            <span className={styles.availableBalance}>
              Available: {' '}
              {assetIn.isBTC ? (
                isBtcBalanceLoading ? (
                  <span className={styles.loadingText}>Loading{loadingDots}</span>
                ) : btcBalanceError ? (
                  <span className={styles.errorText}>Error loading balance</span>
                ) : btcBalanceSats !== undefined ? (
                  `${(btcBalanceSats / 100_000_000).toLocaleString(undefined, { maximumFractionDigits: 8 })} BTC`
                ) : (
                  'N/A' // Should not happen if connected
                )
              ) : (
                isRuneBalancesLoading || isSwapRuneInfoLoading ? (
                  <span className={styles.loadingText}>Loading{loadingDots}</span>
                ) : runeBalancesError || swapRuneInfoError ? (
                  <span className={styles.errorText}>Error loading balance</span>
                ) : (
                  () => {
                    const rawBalance = getSpecificRuneBalance(assetIn.name);
                    const decimals = swapRuneInfo?.decimals ?? 0; 
                    
                    if (rawBalance === null) return 'N/A';
                    try {
                      const balanceNum = parseFloat(rawBalance);
                      if (isNaN(balanceNum)) return 'Invalid Balance';
                      const displayValue = balanceNum / (10 ** decimals);
                      return `${displayValue.toLocaleString(undefined, { maximumFractionDigits: decimals })} ${assetIn.name}`;
                    } catch (e) {
                      console.error("Error formatting rune balance:", e);
                      return 'Formatting Error';
                    }
                  }
                )()
              )}
            </span>
          )}
          {!connected && (<span className={styles.availableBalance}></span>)}
        </div>
        <div className={styles.inputRow}>
          <input
            type="number"
            id="input-amount"
            placeholder="0.0"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            className={styles.amountInput}
            min="0"
            step="0.001"
          />
          {renderAssetSelector(
            assetIn,
            handleSelectAssetIn,
            false,
            assetOut?.isBTC ? 'selectRune' : 'selectBtcOrRune',
            assetOut,
            availableRunes,
            isLoadingRunes,
            currentRunesError,
            searchQuery,
            handleSearchChange
          )}
        </div>
        {inputUsdValue && !isQuoteLoading && (
          <div className={styles.usdValueText}>≈ {inputUsdValue}</div>
        )}
      </div>

      {/* Swap Direction Button */}
      <div className={styles.swapIconContainer}>
        <button
          onClick={handleSwapDirection}
          className={styles.swapIconButton}
          aria-label="Swap direction"
          disabled={!assetIn || !assetOut || isSwapping || isQuoteLoading}
        >
          <ArrowPathIcon className={styles.swapIcon} />
        </button>
      </div>

      {/* Output Area */}
      <div className={styles.inputArea}>
        <label htmlFor="output-amount" className={styles.inputLabel}>
          You Receive (Estimated)
        </label>
        <div className={styles.inputRow}>
          <input
            type="text"
            id="output-amount"
            placeholder="0.0"
            value={isQuoteLoading ? `Loading${loadingDots}` : outputAmount}
            readOnly
            className={styles.amountInputReadOnly}
          />
          {renderAssetSelector(
            assetOut,
            handleSelectAssetOut,
            false,
            assetIn?.isBTC ? 'selectRune' : 'selectBtcOrRune',
            assetIn,
            availableRunes,
            isLoadingRunes,
            currentRunesError,
            searchQuery,
            handleSearchChange
          )}
        </div>
        {outputUsdValue && !isQuoteLoading && (
          <div className={styles.usdValueText}>≈ {outputUsdValue}</div>
        )}
        {quoteError && !isQuoteLoading && (
          <div className={`${styles.quoteErrorText} ${styles.messageWithIcon}`}>
            <Image 
              src="/icons/msg_error-0.png" 
              alt="Error" 
              className={styles.messageIcon}
              width={16}
              height={16}
            />
            <span>{quoteError}</span>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className={styles.infoArea}>
        {assetIn && assetOut && (
          <div className={styles.infoRow}>
            <span>Price:</span>
            <span>
              {(() => {
                if (isQuoteLoading) return loadingDots;
                if (exchangeRate) return exchangeRate;
                // Show N/A only if amount entered, but no quote/rate yet and no specific quote error
                if (debouncedInputAmount > 0 && !quoteError) return 'N/A'; 
                return ''; // Otherwise, display nothing
              })()}
            </span>
          </div>
        )}
      </div>

      {/* Swap Button */}
      <button
        className={styles.swapButton}
        onClick={quoteExpired ? handleFetchQuote : handleSwap} 
        disabled={
          (quoteExpired && isQuoteLoading) ||
          (!quoteExpired && (
            !connected ||
            !inputAmount ||
            parseFloat(inputAmount) <= 0 ||
            !assetIn ||
            !assetOut ||
            isQuoteLoading || 
            !!quoteError || 
            !quote || 
            isSwapping ||
            swapStep === 'success' ||
            (swapStep === 'error' && !quoteExpired)
          ))
        }
      >
        {getSwapButtonText()}
      </button>

      {/* Display Swap Process Status */}
      {isSwapping && swapStep !== 'error' && swapStep !== 'success' && (
        <div className={`${styles.statusText} ${styles.messageWithIcon}`}>
          <Image 
            src="/icons/hourglass-0.png" 
            alt="Processing" 
            className={styles.messageIcon}
            width={16}
            height={16}
          />
          <span>
            {swapStep === 'getting_psbt' && 'Preparing transaction...'}
            {swapStep === 'signing' && 'Waiting for wallet signature...'}
            {swapStep === 'confirming' && 'Broadcasting transaction...'}
            {swapStep === 'idle' && 'Processing...'}
          </span>
        </div>
      )}

      {/* Display Swap Error/Success Messages */}
      {swapError && (
        <div className={`${styles.errorText} ${styles.messageWithIcon}`}>
          <Image 
            src="/icons/msg_error-0.png" 
            alt="Error" 
            className={styles.messageIcon}
            width={16}
            height={16}
          />
          <span>Error: {swapError}</span>
        </div>
      )}
      {!swapError && swapStep === 'success' && txId && (
        <div className={`${styles.successText} ${styles.messageWithIcon}`}>
          <Image 
            src="/icons/check-0.png" 
            alt="Success" 
            className={styles.messageIcon}
            width={16}
            height={16}
          />
          <span>
            Swap successful!
            <a
              href={`https://ordiscan.com/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.txLink}
            >
              View on Ordiscan
            </a>
          </span>
        </div>
      )}
    </div>
  );
}

export default SwapTab; 