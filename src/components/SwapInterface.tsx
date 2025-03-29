'use client';

import React, { useState, useEffect, Fragment, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { searchRunes, type Rune, fetchQuote, getPSBT, confirmPSBT, popularCollections } from '@/lib/sats-terminal'; // Added popularCollections
import {
  getBtcBalance,
  getRuneBalances,
  getRuneInfo,
  getListRunes,
  getAddressRuneActivity, // <-- Import new function
  type RuneBalance as OrdiscanRuneBalance,
  type RuneInfo as OrdiscanRuneInfo,
  type RuneActivityEvent, // <-- Import new type
  type RunestoneMessage, // <-- Import RunestoneMessage
} from '@/lib/ordiscan'; // <-- Import Ordiscan functions
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/solid'; // Added ArrowPathIcon
import debounce from 'lodash.debounce';
import styles from './SwapInterface.module.css';
import { SatsTerminal, type QuoteResponse, type PSBTResponse, type RuneOrder } from 'satsterminal-sdk'; // Added RuneOrder
import { useSharedLaserEyes } from '@/context/LaserEyesContext'; // Import the shared hook
import { useDebounce } from 'use-debounce'; // Import useDebounce

// CoinGecko API endpoint
const COINGECKO_BTC_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

// Function to fetch BTC price
const getBtcPrice = async (): Promise<number> => {
  const response = await fetch(COINGECKO_BTC_PRICE_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch BTC price from CoinGecko');
  }
  const data = await response.json();
  if (!data.bitcoin || !data.bitcoin.usd) {
    throw new Error('Invalid response format from CoinGecko');
  }
  return data.bitcoin.usd;
};

// Initialize terminal - No longer needed here if using lib functions
// const apiKey = process.env.NEXT_PUBLIC_SATS_TERMINAL_API_KEY;
// if (!apiKey) {
//   console.warn("SatsTerminal API key not found. Please set NEXT_PUBLIC_SATS_TERMINAL_API_KEY environment variable.");
// }
// const terminal = new SatsTerminal({ apiKey: apiKey || '' });

// Define Asset type including BTC
interface Asset {
  id: string; // Use ticker/name for runes, 'BTC' for Bitcoin
  name: string;
  imageURI?: string;
  isBTC?: boolean; // Flag to identify BTC
}

// Define BTC as a selectable asset
const BTC_ASSET: Asset = { id: 'BTC', name: 'BTC', imageURI: '/Bitcoin.svg', isBTC: true };


// Type adjustment for popular collections response
// interface PopularRune extends Rune { // No longer needed if using Asset type
//   // Add other relevant fields from popularCollections response if needed
// }

// Mock address for fetching quotes when disconnected
const MOCK_ADDRESS = '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo';

// --- Remove Local Helper Hook --- 
/*
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
*/
// --- End Removed Helper Hook ---

// --- Types ---
// ... Asset type ...
// type ActiveTab = 'swap' | 'runesInfo'; // REMOVE this type definition

// --- Props Interface ---
interface SwapInterfaceProps {
  activeTab: 'swap' | 'runesInfo' | 'yourTxs'; // Define the prop, add 'yourTxs'
}
// --- End Props --- 

// --- Component --- 
export function SwapInterface({ activeTab }: SwapInterfaceProps) { // Destructure the prop
  // LaserEyes hook for wallet info and signing
  // Use the shared hook
  const { 
    connected, 
    address, 
    publicKey, 
    paymentAddress, 
    paymentPublicKey, 
    signPsbt, // Import signPsbt function
    address: connectedAddress
  } = useSharedLaserEyes();
  
  // TEMP: Provide dummy values to avoid breaking the component structure during test - REMOVED
  /*
  const connected = false;
  const address = null;
  const publicKey = null;
  const paymentAddress = null;
  const paymentPublicKey = null;
  const signPsbt = async (psbt: string) => { console.warn('signPsbt called while useLaserEyes is commented out'); return { signedPsbtBase64: '' }; };
  const connectedAddress = null;
  */

  // State for input/output amounts
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState(''); // Output is now calculated/read-only

  // State for selected assets
  const [assetIn, setAssetIn] = useState<Asset>(BTC_ASSET);
  const [assetOut, setAssetOut] = useState<Asset | null>(null);

  // State for rune fetching/searching
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPopularLoading, setIsPopularLoading] = useState(true);
  const [popularRunes, setPopularRunes] = useState<Asset[]>([]); // Use Asset type
  const [searchResults, setSearchResults] = useState<Asset[]>([]); // Use Asset type
  const [searchError, setSearchError] = useState<string | null>(null);
  const [popularError, setPopularError] = useState<string | null>(null);

  // State for quote fetching
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // State for calculated prices
  const [exchangeRate, setExchangeRate] = useState<string | null>(null); // e.g., "1 BTC = 1,000,000 DOG" or "1 DOG = 0.000001 BTC"
  const [inputUsdValue, setInputUsdValue] = useState<string | null>(null); // USD value of the input amount

  // State for swap process
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStep, setSwapStep] = useState<'idle' | 'getting_psbt' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [psbtData, setPsbtData] = useState<PSBTResponse | null>(null); // Store PSBT response
  const [signedPsbtBase64, setSignedPsbtBase64] = useState<string | null>(null); // Store main signed PSBT
  const [txId, setTxId] = useState<string | null>(null); // Store final transaction ID

  // State for loading dots animation
  const [loadingDots, setLoadingDots] = useState('.');

  // --- State for Tabs and Runes Info ---
  // REMOVE this state management
  // const [activeTab, setActiveTab] = useState<ActiveTab>('swap');
  const [runeInfoSearchQuery, setRuneInfoSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(runeInfoSearchQuery, 500); // Debounce input by 500ms
  const [selectedRuneForInfo, setSelectedRuneForInfo] = useState<OrdiscanRuneInfo | null>(null);
  // --- End State ---

  // Fetch BTC price using React Query
  const {
    data: btcPriceUsd,
    isLoading: isBtcPriceLoading,
    error: btcPriceError,
  } = useQuery<number, Error>({
    queryKey: ['btcPriceUsd'],
    queryFn: getBtcPrice,
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // --- Ordiscan Balance Queries ---
  const {
    data: btcBalanceSats,
    isLoading: isBtcBalanceLoading,
    error: btcBalanceError,
    refetch: refetchBtcBalance, // Function to manually refetch
  } = useQuery<number, Error>({
    queryKey: ['btcBalance', paymentAddress], // Include address in key
    queryFn: () => getBtcBalance(paymentAddress!), // Use non-null assertion, handled by enabled
    enabled: !!connected && !!paymentAddress, // Only run query if connected and address exists
    staleTime: 30000, // Consider balance stale after 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  const {
    data: runeBalances,
    isLoading: isRuneBalancesLoading,
    error: runeBalancesError,
    refetch: refetchRuneBalances, // Function to manually refetch
  } = useQuery<OrdiscanRuneBalance[], Error>({
    queryKey: ['runeBalances', address], // Include address in key
    queryFn: () => getRuneBalances(address!), // Use non-null assertion, handled by enabled
    enabled: !!connected && !!address, // Only run query if connected and address exists
    staleTime: 30000, // Consider balances stale after 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  // Query for Rune Info (for Swap Tab balance)
  const {
    data: swapRuneInfo, 
    isLoading: isSwapRuneInfoLoading,
    error: swapRuneInfoError,
  } = useQuery<OrdiscanRuneInfo | null, Error>({
    queryKey: ['runeInfo', assetIn?.name?.replace(/•/g, '')],
    queryFn: () => assetIn && !assetIn.isBTC && assetIn.name ? getRuneInfo(assetIn.name) : Promise.resolve(null),
    enabled: activeTab === 'swap' && !!assetIn && !assetIn.isBTC && !!assetIn.name, // Use prop here
    staleTime: Infinity,
  });

  // Query for Runes List (for browsing when search is empty)
  const {
    data: runesList, // List of latest runes
    isLoading: isRunesListLoading,
    error: runesListError,
  } = useQuery<OrdiscanRuneInfo[], Error>({
    queryKey: ['runesList'],
    queryFn: getListRunes,
    enabled: activeTab === 'runesInfo', // Still enable when tab is active
    staleTime: 5 * 60 * 1000, 
    refetchOnWindowFocus: false, 
  });

  // NEW: Query for SPECIFIC Rune based on DEBOUNCED search input
  const {
    data: searchedRuneInfo, 
    isLoading: isSearchingRuneInfo, 
    error: searchRuneInfoError, 
    isFetching: isFetchingSearchedRuneInfo, 
  } = useQuery<OrdiscanRuneInfo | null, Error>({
    // Safely handle potentially undefined debouncedSearchQuery
    queryKey: ['runeInfo', (debouncedSearchQuery || '').toUpperCase()], 
    queryFn: async () => {
      // Ensure we use the actual debounced value check here as well
      const queryToSearch = debouncedSearchQuery || '';
      if (!queryToSearch) return null; 
      try {
        const result = await getRuneInfo(queryToSearch);
        return result; 
      } catch (error: any) {
        if (error.message && error.message.includes('404')) {
          return null; 
        } 
        console.error("Error searching rune info:", error);
        throw error; 
      }
    },
    // Enable check should also use the potentially undefined value correctly
    enabled: activeTab === 'runesInfo' && !!debouncedSearchQuery, 
    staleTime: 1 * 60 * 1000, 
    retry: (failureCount, error: any) => {
        if (error.message && error.message.includes('404')) {
          return false;
        }
        return failureCount < 3;
    },
  });

  // Query for Selected Rune Details (for details pane - unchanged)
   const {
    data: detailedRuneInfo, 
    isLoading: isDetailedRuneInfoLoading,
    error: detailedRuneInfoError,
  } = useQuery<OrdiscanRuneInfo | null, Error>({
    queryKey: ['runeInfo', selectedRuneForInfo?.name], 
    queryFn: () => selectedRuneForInfo ? getRuneInfo(selectedRuneForInfo.name) : Promise.resolve(null),
    enabled: activeTab === 'runesInfo' && !!selectedRuneForInfo, 
    staleTime: Infinity, 
  });

  // --- NEW: Query for User's Rune Transaction Activity ---
  const {
      data: runeActivity,
      isLoading: isRuneActivityLoading,
      error: runeActivityError,
      // Add pagination state/controls later if needed
  } = useQuery<RuneActivityEvent[], Error>({
      queryKey: ['runeActivity', address], // Use Ordinals address
      queryFn: () => getAddressRuneActivity(address!), // Fetch page 1 by default
      enabled: activeTab === 'yourTxs' && !!connected && !!address, // Only fetch when tab is active and connected
      staleTime: 60 * 1000, // Stale after 1 minute
      refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
  // --- End Ordiscan Queries ---

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

  // Fetch popular runes on mount
  useEffect(() => {
    const fetchPopular = async () => {
      setIsPopularLoading(true);
      setPopularError(null);
      setPopularRunes([]); // Reset popular runes initially
      try {
        // Use the imported lib function
        const response = await popularCollections({}); 

        // Check if response is an array
        if (!Array.isArray(response)) {
          console.warn("Popular collections response is not an array.", response);
          setPopularRunes([]);
        } else {
          // Map directly over the response array to Asset type
          const mappedRunes: Asset[] = response.map((collection: any) => ({
            id: collection.rune, // Use rune ticker as ID
            name: collection.etching?.runeName || collection.rune, // Fallback to ticker if name missing
            imageURI: collection.icon_content_url_data || collection.imageURI, // Extract image URL
            isBTC: false, // Mark as not BTC
          }));
          setPopularRunes(mappedRunes);

          // Set initial output asset if input is BTC and output is not set yet
          if (assetIn.isBTC && !assetOut && mappedRunes.length > 0) {
            setAssetOut(mappedRunes[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching popular runes:", error);
        setPopularError(error instanceof Error ? error.message : 'Failed to fetch popular runes');
        setPopularRunes([]); // Ensure empty on error
      } finally {
        setIsPopularLoading(false);
      }
    };
    fetchPopular();
  }, [assetIn.isBTC]); // Re-run if assetIn changes (e.g., after swap direction)


  // Debounced search function (updated for Asset type)
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      try {
        const results: Rune[] = await searchRunes(query); // searchRunes returns Rune[]
        // Map Rune[] to Asset[]
        const mappedResults: Asset[] = results.map(rune => ({
          id: rune.id, // Assuming Rune has an id property (like ticker)
          name: rune.name,
          imageURI: rune.imageURI,
          isBTC: false,
        }));
        setSearchResults(mappedResults);
      } catch (error) {
        console.error("Error searching runes:", error);
        setSearchError(error instanceof Error ? error.message : 'Search failed');
        setSearchResults([]); // Clear results on error
      } finally {
        setIsSearching(false);
      }
    }, 500), // 500ms debounce delay
    []
  );

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

  // Combine BTC and Runes for selector options
  const allSelectableAssets = [BTC_ASSET, ...availableRunes];

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
  };

  const handleSelectAssetOut = (selectedAsset: Asset) => {
    // Prevent selecting the same asset for both input and output
    if (assetIn && selectedAsset.id === assetIn.id) return;

    setAssetOut(selectedAsset);
    // If selected asset is BTC, ensure input is a Rune
    if (selectedAsset.isBTC) {
      if (!assetIn || assetIn.isBTC) {
        // Set to first available rune or null if none
        setAssetIn(popularRunes.length > 0 ? popularRunes[0] : BTC_ASSET); // Fallback to BTC if no runes
      }
    } else {
      // If selected asset is a Rune, ensure input is BTC
      setAssetIn(BTC_ASSET);
    }
    // Clear amounts and quote when assets change
    setInputAmount('');
    setOutputAmount('');
    setQuote(null);
    setQuoteError(null);
    setExchangeRate(null);
    setInputUsdValue(null);
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
    // Reset swap process state
    setIsSwapping(false);
    setSwapStep('idle');
    setSwapError(null);
    setPsbtData(null);
    setSignedPsbtBase64(null);
    setTxId(null);
  };

  // --- Quote & Price Calculation ---

  // Memoized function to fetch quote, adapting to swap direction
  const handleFetchQuote = useCallback(async () => {
    const isBtcToRune = assetIn?.isBTC;
    const runeAsset = isBtcToRune ? assetOut : assetIn;

    // Use the correctly typed debouncedInputAmount (should now be a number)
    if (!assetIn || !assetOut || !runeAsset || runeAsset.isBTC || debouncedInputAmount <= 0) { 
        return;
    }

    setIsQuoteLoading(true);
    setQuote(null); // Clear previous quote
    setQuoteError(null);
    setExchangeRate(null); // Clear previous rate

    const effectiveAddress = connectedAddress || MOCK_ADDRESS;

    try {
      // Determine parameters based on direction
      // NOTE: Assuming `btcAmount` param is used for RUNE amount when `sell: true`.
      // This needs verification based on SatsTerminal SDK capabilities for Rune->BTC quotes.
      const params = {
        btcAmount: debouncedInputAmount, // Amount of the INPUT asset
        runeName: runeAsset.name,
        address: effectiveAddress,
        sell: !isBtcToRune, // sell: true if assetIn is Rune (Rune -> BTC)
        // rbfProtection: false, // Optional: Add UI later
        // marketplaces: [], // Optional: Add UI later
      };

      const quoteResponse = await fetchQuote(params);
      setQuote(quoteResponse);

      // --- Output Amount & Exchange Rate Update Logic ---
      let calculatedOutputAmount = '';
      let calculatedRate = null;

      if (quoteResponse) {
        const inputVal = debouncedInputAmount;
        let outputVal = 0;
        let btcValue = 0;
        let runeValue = 0;

        try {
          if (isBtcToRune) {
            // Input: BTC, Output: Rune
            outputVal = parseFloat(quoteResponse.totalFormattedAmount || '0');
            btcValue = inputVal;
            runeValue = outputVal;
            calculatedOutputAmount = outputVal.toLocaleString(undefined, {});
          } else {
            // Input: Rune, Output: BTC
            outputVal = parseFloat(quoteResponse.totalPrice || '0');
            runeValue = inputVal;
            btcValue = outputVal;
            calculatedOutputAmount = outputVal.toLocaleString(undefined, { maximumFractionDigits: 8 }); // Show more precision for BTC
          }

          // Calculate exchange rate
          if (btcValue > 0 && runeValue > 0) {
            if (isBtcToRune) {
              // Calculate USD price per rune (BTC to Rune direction)
              // USD per rune = (BTC amount * BTC price in USD) / Rune amount
              const btcUsdAmount = btcValue * (btcPriceUsd || 0);
              const pricePerRune = btcUsdAmount / runeValue;
              calculatedRate = `${pricePerRune.toLocaleString(undefined, { 
                style: 'currency', 
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
              })} per ${runeAsset.name}`;
            } else {
              // Calculate USD price per rune (Rune to BTC direction)
              // USD per rune = BTC amount * BTC price in USD / Rune amount
              const btcUsdAmount = btcValue * (btcPriceUsd || 0);
              const pricePerRune = btcUsdAmount / runeValue;
              calculatedRate = `${pricePerRune.toLocaleString(undefined, { 
                style: 'currency', 
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
              })} per ${runeAsset.name}`;
            }
          }
          setExchangeRate(calculatedRate);

        } catch (e) {
          console.error("Error parsing quote amounts:", e);
          calculatedOutputAmount = 'Error';
          setExchangeRate('Error calculating rate');
        }
      }
      setOutputAmount(calculatedOutputAmount);
      // --- End Output Amount & Rate Update Logic ---

    } catch (err) {
      console.error("Quote fetch error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quote';
      // Provide more specific feedback if possible
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
  }, [assetIn, assetOut, debouncedInputAmount, connectedAddress, btcPriceUsd]);


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
      setInputUsdValue(null); // Also reset USD value
    }
  }, [debouncedInputAmount, assetIn, assetOut, handleFetchQuote]);

  // UseEffect to calculate input USD value
  useEffect(() => {
    if (!inputAmount || !assetIn || isBtcPriceLoading || btcPriceError) {
        setInputUsdValue(null);
        return;
    }

    try {
      const amountNum = parseFloat(inputAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
          setInputUsdValue(null);
          return;
      }

      let usdValue: number | null = null;

      if (assetIn.isBTC && btcPriceUsd) {
          // Input is BTC
          usdValue = amountNum * btcPriceUsd;
      } else if (!assetIn.isBTC && quote && quote.totalPrice && btcPriceUsd && !isQuoteLoading) {
          // Input is Rune, use quote's BTC value
          // This assumes quote.totalPrice is the BTC value for the *input* rune amount
          // when selling Rune -> BTC. This needs verification.
           // Calculate BTC per rune from the quote
           // If selling (input=rune): totalPrice is BTC received for totalFormattedAmount runes
           // If buying (input=btc): totalPrice is BTC paid for totalFormattedAmount runes
           const btcPerRune = (quote.totalPrice && quote.totalFormattedAmount && parseFloat(quote.totalFormattedAmount) > 0)
               ? parseFloat(quote.totalPrice) / parseFloat(quote.totalFormattedAmount)
               : 0;

           if (btcPerRune > 0) {
                // Calculate USD value based on input rune amount and derived BTC price per rune
                usdValue = amountNum * btcPerRune * btcPriceUsd;
           }
      }

      if (usdValue !== null && usdValue > 0) {
        setInputUsdValue(usdValue.toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }));
      } else {
        setInputUsdValue(null);
      }
    } catch (e) {
      console.error("Failed to calculate input USD value:", e);
      setInputUsdValue(null);
    }
  // Add quote, isQuoteLoading as dependencies
  }, [inputAmount, assetIn, btcPriceUsd, isBtcPriceLoading, btcPriceError, quote, isQuoteLoading]);


  // Reset swap state when inputs/wallet change significantly
  useEffect(() => {
    setIsSwapping(false);
    setSwapStep('idle');
    setSwapError(null);
    setPsbtData(null);
    setSignedPsbtBase64(null);
    setTxId(null);
    // Don't reset amounts/assets here, handled by selection logic
  }, [inputAmount, assetIn, assetOut, address, connected]);

  // Function to handle the entire swap process
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

    try {
      // 1. Get PSBT
      setSwapStep('getting_psbt');
      // Ensure orders is typed correctly
      const orders: RuneOrder[] = quote.selectedOrders || [];
      const psbtResult = await getPSBT({
        orders: orders, // Use orders from quote
        address: address, // User's Ordinals address
        publicKey: publicKey, // User's Ordinals public key
        paymentAddress: paymentAddress, // User's Payment address (BTC)
        paymentPublicKey: paymentPublicKey, // User's Payment public key (BTC)
        runeName: runeAsset.name, // The name of the rune involved
        sell: !isBtcToRune, // sell: true if selling Rune -> BTC
        // feeRate: 5, // Optional: Add UI for this later
        // slippage: 9, // Optional: Add UI for this later
        // rbfProtection: false, // Start without RBF
      });
      setPsbtData(psbtResult);

      // Extract PSBT base64 and swap ID safely
      const psbtBase64 = (psbtResult as any)?.psbtBase64 || (psbtResult as any)?.psbt; // Check both common names
      const swapId = (psbtResult as any)?.swapId;
      const rbfPsbtBase64 = (psbtResult as any)?.rbfProtected?.base64; // Check for RBF PSBT

      // More specific checks
      if (!psbtBase64) {
        throw new Error(`Invalid PSBT data: Missing PSBT base64 property. Response: ${JSON.stringify(psbtResult)}`);
      }
      if (!swapId) {
        throw new Error(`Invalid PSBT data: Missing 'swapId' property. Response: ${JSON.stringify(psbtResult)}`);
      }

      // 2. Sign PSBT(s)
      setSwapStep('signing');
      const mainSigningResult = await signPsbt(psbtBase64);
      const signedMainPsbt = mainSigningResult?.signedPsbtBase64;
      if (!signedMainPsbt) {
          throw new Error("Main PSBT signing cancelled or failed.");
      }
      setSignedPsbtBase64(signedMainPsbt); // Store main signed PSBT

      let signedRbfPsbt: string | null = null;
      // Check if RBF protection PSBT exists and needs signing
      if (rbfPsbtBase64) {
          const rbfSigningResult = await signPsbt(rbfPsbtBase64);
          signedRbfPsbt = rbfSigningResult?.signedPsbtBase64 ?? null; 
          if (!signedRbfPsbt) {
              console.warn("RBF PSBT signing cancelled or failed. Proceeding without RBF confirmation might be possible depending on API.");
          }
      }

      // 3. Confirm PSBT
      setSwapStep('confirming');
      const confirmParams = {
        orders: orders,
        address: address,
        publicKey: publicKey,
        paymentAddress: paymentAddress,
        paymentPublicKey: paymentPublicKey,
        signedPsbtBase64: signedMainPsbt, // Main signed PSBT
        swapId: swapId,
        runeName: runeAsset.name,
        sell: !isBtcToRune,
        // Pass signed RBF PSBT if it exists and was signed
        signedRbfPsbtBase64: signedRbfPsbt ?? undefined, // Pass undefined if null (matches SDK type)
        rbfProtection: !!signedRbfPsbt, // Indicate RBF is active if RBF PSBT was signed
      };
      const confirmResult = await confirmPSBT(confirmParams);

      if (!confirmResult || !confirmResult.txid) {
        // Handle potential RBF-related txid structure
        const finalTxId = confirmResult.txid || confirmResult.rbfProtection?.fundsPreparationTxId;
        if (!finalTxId) {
            throw new Error(`Confirmation failed or transaction ID missing. Response: ${JSON.stringify(confirmResult)}`);
        }
        setTxId(finalTxId);
      } else {
          setTxId(confirmResult.txid);
      }

      setSwapStep('success');


    } catch (error) {
      console.error("Swap failed:", error);
      setSwapError(error instanceof Error ? error.message : "An unknown error occurred during the swap.");
      setSwapStep('error');
    } finally {
      setIsSwapping(false);
    }
  };

  // Dynamic swap button text
  const getSwapButtonText = () => {
    if (!connected) return 'Connect Wallet';
    if (isQuoteLoading) return `Fetching Quote${loadingDots}`;
    if (!assetIn || !assetOut) return 'Select Assets';
    if (!inputAmount || parseFloat(inputAmount) <= 0) return 'Enter Amount';
    if (!quote && !quoteError && debouncedInputAmount > 0) return `Getting Quote${loadingDots}`; // Show loading if waiting for quote
    if (quoteError) return 'Quote Error';
    if (!quote) return 'Get Quote'; // Should only show if amount > 0 but no quote yet (e.g., before debounce)
    if (isSwapping) {
      switch (swapStep) {
        case 'getting_psbt': return `Generating Transaction${loadingDots}`;
        case 'signing': return `Waiting for Signature${loadingDots}`;
        case 'confirming': return `Confirming Swap${loadingDots}`;
        default: return `Processing Swap${loadingDots}`;
      }
    }
    if (swapStep === 'success' && txId) return 'Swap Successful!';
    if (swapStep === 'error') return 'Swap Failed';
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
  ) => (
    <div className={styles.listboxContainer}>
        <Listbox value={value} onChange={onChange} disabled={disabled || isLoadingRunes}>
            <div className={styles.listboxRelative}>
                <Listbox.Button className={styles.listboxButton}>
                    <span className={styles.listboxButtonText}>
                        {value?.imageURI && (
                            <img
                                src={value.imageURI}
                                alt={`${value.name} logo`}
                                className={styles.assetButtonImage} // Use same style as BTC button image
                                aria-hidden="true"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
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
                                                <img src={BTC_ASSET.imageURI} alt="" className={styles.runeImage} aria-hidden="true" />
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
                                <img 
                                    src="/icons/magnifying_glass-0.png" 
                                    alt="Search" 
                                    className={styles.searchIconEmbedded} 
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
                            <img 
                              src="/icons/msg_error-0.png" 
                              alt="Error" 
                              className={styles.messageIcon} 
                            />
                            <span>{currentRunesError}</span>
                          </div>
                        )}
                        {!isLoadingRunes && !currentRunesError && availableRunes.length === 0 && (
                             <div className={styles.listboxLoadingOrEmpty}>
                                {searchQuery ? 'No matching runes found' : (purpose === 'selectBtcOrRune' ? 'No other runes available' : 'No runes available')}
                             </div>
                        )}

                        {availableRunes
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
                                                <img
                                                    src={rune.imageURI}
                                                    alt=""
                                                    className={styles.runeImage} // Use rune image style
                                                    aria-hidden="true"
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
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

  // --- Find specific rune balance --- (Helper Function)
  const getSpecificRuneBalance = (runeName: string | undefined): string | null => {
    if (!runeName || !runeBalances) return null;
    // Ordiscan returns names without spacers, so compare without them
    const formattedRuneName = runeName.replace(/•/g, '');
    const found = runeBalances.find(rb => rb.name === formattedRuneName);
    return found ? found.balance : '0'; // Return '0' if not found, assuming 0 balance
  };

  // Filtered Runes List for Runes Info Tab - ONLY used when search is EMPTY
  const filteredRunesList = useMemo(() => {
    if (!runesList || runeInfoSearchQuery) return []; // Return empty if searching
    // No need to filter here anymore if search is empty, just return the full list
    return runesList;
  }, [runesList, runeInfoSearchQuery]);

  return (
    <div className={styles.container}>
      {/* --- REMOVE Tabs --- */}
      {/* <div className={styles.tabContainer}> ... </div> */}

      {/* --- Conditional Content (using prop) --- */}
      {activeTab === 'swap' && (
        <>
          <h2 className={styles.title}>Swap</h2> {/* Updated title */}

          {/* Input Area */}
          <div className={styles.inputArea}>
            <div className={styles.inputHeader}> {/* Wrap label and balance */}
              <label htmlFor="input-amount" className={styles.inputLabel}>You Pay</label>
              {/* --- Balance Display Logic --- */}
              {connected && assetIn && (
                <span className={styles.availableBalance}>
                  Available: {' '}
                  {assetIn.isBTC ? (
                    // BTC Balance Display
                    isBtcBalanceLoading ? (
                      'Loading...'
                    ) : btcBalanceError ? (
                      'Error'
                    ) : btcBalanceSats !== undefined ? (
                      `${(btcBalanceSats / 100_000_000).toLocaleString(undefined, { maximumFractionDigits: 8 })} BTC`
                    ) : (
                      'N/A' // Should not happen if connected
                    )
                  ) : (
                    // Rune Balance Display (Updated for Swap Tab)
                    isRuneBalancesLoading || isSwapRuneInfoLoading ? (
                      'Loading...'
                    ) : runeBalancesError || swapRuneInfoError ? (
                      'Error'
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
              {!connected && (<span className={styles.availableBalance}></span>)} {/* Placeholder when not connected */}
               {/* --- End Balance Display Logic --- */}
            </div>
            <div className={styles.inputRow}>
              <input
                type="number"
                id="input-amount"
                placeholder="0.0"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className={styles.amountInput}
                min="0" // Prevent negative numbers
                step="0.001" // Allow decimals, set increment step
              />
              {/* Asset Selector for Input - Pass assetOut as otherAsset */}
              {renderAssetSelector(
                  assetIn,
                  handleSelectAssetIn,
                  false, // Not disabled by default
                  assetOut?.isBTC ? 'selectRune' : 'selectBtcOrRune',
                  assetOut, // Pass the output asset as the "other" asset
                  availableRunes,
                  isLoadingRunes,
                  currentRunesError,
                  searchQuery,
                  handleSearchChange
              )}
            </div>
            {/* Display Input USD Value */}
            {inputUsdValue && !isQuoteLoading && ( // Hide USD value while quote is loading as it might be inaccurate
              <div className={styles.usdValueText}>≈ {inputUsdValue}</div>
            )}
          </div>

          {/* Swap Direction Button */}
           <div className={styles.swapIconContainer}>
               <button
                   onClick={handleSwapDirection}
                   className={styles.swapIconButton}
                   aria-label="Swap direction"
                   disabled={!assetIn || !assetOut || isSwapping || isQuoteLoading} // Disable during swap/load
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
                type="text" // Read-only, display calculated value
                id="output-amount"
                placeholder="0.0"
                value={isQuoteLoading ? loadingDots : outputAmount}
                readOnly
                className={styles.amountInputReadOnly} // Style as read-only
              />
              {/* Asset Selector for Output - Pass assetIn as otherAsset */}
               {renderAssetSelector(
                  assetOut,
                  handleSelectAssetOut,
                  false, // Not disabled by default
                  assetIn?.isBTC ? 'selectRune' : 'selectBtcOrRune',
                  assetIn, // Pass the input asset as the "other" asset
                  availableRunes,
                  isLoadingRunes,
                  currentRunesError,
                  searchQuery,
                  handleSearchChange
               )}
            </div>
            {/* Display Output USD Value - Mirrors Input USD Value */}
            {inputUsdValue && !isQuoteLoading && (
              <div className={styles.usdValueText}>≈ {inputUsdValue}</div>
            )}
            {/* Display Quote Error specific to output */}
            {quoteError && !isQuoteLoading && (
               <div className={`${styles.quoteErrorText} ${styles.messageWithIcon}`}>
                   <img 
                     src="/icons/msg_error-0.png" 
                     alt="Error" 
                     className={styles.messageIcon} 
                   />
                   <span>{quoteError}</span>
               </div>
            )}
          </div>


          {/* Info Area - REMOVE BTC Price from here */}
          <div className={styles.infoArea}>
            {/* Exchange Rate */}
            {assetIn && assetOut && ( // Show row if both assets are selected
              <div className={styles.infoRow}>
                 <span>Price:</span>
                 <span>
                    {isQuoteLoading
                        ? loadingDots
                        : exchangeRate
                        ? exchangeRate
                        : (debouncedInputAmount > 0 && !quoteError) // Only show N/A if trying to load but no rate yet
                        ? 'N/A'
                        : ''} {/* Hide if no amount entered or error */}
                 </span>
              </div>
            )}
          </div>

          {/* Swap Button */}
          <button
            className={styles.swapButton}
            onClick={handleSwap}
            disabled={
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
              swapStep === 'error'
            }
          >
            {getSwapButtonText()}
          </button>

          {/* Display Swap Error/Success Messages */}
          {swapStep === 'error' && swapError && (
             <div className={`${styles.errorText} ${styles.messageWithIcon}`}>
                <img src="/icons/msg_error-0.png" alt="Error" className={styles.messageIcon} />
                <span>Error: {swapError}</span>
             </div>
          )}
          {swapStep === 'success' && txId && (
            <div className={`${styles.successText} ${styles.messageWithIcon}`}>
                 <img src="/icons/info-0.png" alt="Success" className={styles.messageIcon} />
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
        </>
      )}

      {activeTab === 'runesInfo' && (
        <div className={styles.runesInfoTabContainer}>
          {/* Search Bar */} 
          <div className={styles.searchContainerRunesInfo}>
             <div className={styles.searchWrapper}> {/* Reuse search wrapper style */} 
                <img src="/icons/magnifying_glass-0.png" alt="Search" className={styles.searchIconEmbedded} />
                <input
                    type="text"
                    placeholder="Search runes by exact name..."
                    value={runeInfoSearchQuery}
                    onChange={(e) => setRuneInfoSearchQuery(e.target.value)}
                    className={styles.searchInput} 
                />
             </div>
          </div>

          {/* Rune List / Search Results Area */} 
          <div className={styles.runesListContainer}>
            {/* --- Case 1: Browsing (Search Empty) --- */} 
            {!debouncedSearchQuery && (
              <>
                {isRunesListLoading && <div className={styles.listboxLoadingOrEmpty}>Loading Latest Runes...</div>}
                {runesListError && <div className={styles.listboxError}>Error loading runes: {runesListError.message}</div>}
                {!isRunesListLoading && !runesListError && filteredRunesList.length === 0 && (
                    <div className={styles.listboxLoadingOrEmpty}>No recent runes found</div>
                )}
                {!isRunesListLoading && !runesListError && filteredRunesList.map((rune) => (
                    <button 
                        key={rune.id}
                        className={`${styles.runeListItem} ${selectedRuneForInfo?.id === rune.id ? styles.runeListItemSelected : ''}`}
                        onClick={() => setSelectedRuneForInfo(rune)}
                    >
                        {rune.formatted_name}
                    </button>
                ))}
              </>
            )}

            {/* --- Case 2: Searching (Search Not Empty) --- */}
            {debouncedSearchQuery && (
              <>
                {isFetchingSearchedRuneInfo && <div className={styles.listboxLoadingOrEmpty}>Searching for {debouncedSearchQuery}...</div>}
                {searchRuneInfoError && <div className={styles.listboxError}>Error searching: {searchRuneInfoError.message}</div>}
                {!isFetchingSearchedRuneInfo && !searchRuneInfoError && searchedRuneInfo && (
                  // Found a result
                  <button 
                      key={searchedRuneInfo.id}
                      className={`${styles.runeListItem} ${selectedRuneForInfo?.id === searchedRuneInfo.id ? styles.runeListItemSelected : ''}`}
                      onClick={() => setSelectedRuneForInfo(searchedRuneInfo)}
                  >
                      {searchedRuneInfo.formatted_name}
                  </button>
                )}
                {!isFetchingSearchedRuneInfo && !searchRuneInfoError && !searchedRuneInfo && (
                   // Not found (and not loading/error)
                   <div className={styles.listboxLoadingOrEmpty}>Rune "{debouncedSearchQuery}" not found.</div>
                )}
              </>
            )}
          </div>

          {/* Rune Details */} 
          <div className={styles.runeDetailsContainer}>
            {isDetailedRuneInfoLoading && selectedRuneForInfo && <p>Loading details for {selectedRuneForInfo.formatted_name}...</p>}
            {detailedRuneInfoError && selectedRuneForInfo && <p className={styles.errorText}>Error loading details: {detailedRuneInfoError.message}</p>}
            {detailedRuneInfo && (
                <div>
                    <h3>{detailedRuneInfo.formatted_name} ({detailedRuneInfo.symbol})</h3>
                    <p><strong>ID:</strong> {detailedRuneInfo.id}</p>
                    <p><strong>Number:</strong> {detailedRuneInfo.number}</p>
                    <p><strong>Decimals:</strong> {detailedRuneInfo.decimals}</p>
                    <p><strong>Etching Tx:</strong> {detailedRuneInfo.etching_txid ? <a href={`https://ordiscan.com/tx/${detailedRuneInfo.etching_txid}`} target="_blank" rel="noopener noreferrer" className={styles.txLink}>{detailedRuneInfo.etching_txid.substring(0,8)}...</a> : 'N/A'}</p>
                    {/* Add more details as needed */} 
                    <p><strong>Current Supply:</strong> {detailedRuneInfo.current_supply ? parseFloat(detailedRuneInfo.current_supply) / (10 ** detailedRuneInfo.decimals) : 'N/A'}</p>
                </div>
            )}
            {/* Updated Hint Text Logic */}
            {!selectedRuneForInfo && !isRunesListLoading && !isFetchingSearchedRuneInfo && (
                 <p className={styles.hintText}>{(debouncedSearchQuery && searchedRuneInfo) ? 'Click the rune above to load details.' : 'Select a rune from the list or search by name.'}</p>
            )}
          </div>
        </div>
      )}

      {/* --- NEW: Your TXs Tab --- */} 
      {activeTab === 'yourTxs' && (
        <div className={styles.yourTxsTabContainer}>
          <h2 className={styles.title}>Your Rune Transactions</h2>
          {!connected || !address ? (
            <p className={styles.hintText}>Connect your wallet to view your transactions.</p>
          ) : isRuneActivityLoading ? (
            <p className={styles.listboxLoadingOrEmpty}>Loading your transactions...</p>
          ) : runeActivityError ? (
            <p className={styles.listboxError}>Error loading transactions: {runeActivityError.message}</p>
          ) : !runeActivity || runeActivity.length === 0 ? (
            <p className={styles.hintText}>No recent rune transactions found for this address.</p>
          ) : (
            <div className={styles.txListContainer}> 
              {runeActivity.map((tx) => (
                <div key={tx.txid} className={styles.txListItem}>
                  <div className={styles.txHeader}>
                    <a 
                      href={`https://ordiscan.com/tx/${tx.txid}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.txLinkBold}
                    >
                      TXID: {tx.txid.substring(0, 8)}...{tx.txid.substring(tx.txid.length - 8)}
                    </a>
                    <span className={styles.txTimestamp}>
                      {new Date(tx.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.txDetails}> 
                    {/* --- Updated TX Details Logic --- */}
                    {(() => {
                       // Determine Action, Rune, and Amount
                       let action = 'Unknown';
                       let runeName = 'N/A';
                       let runeAmountRaw = 'N/A';
                       const userAddress = address; // Use the connected ordinals address

                       // Prioritize MINT/ETCH from messages
                       const mintEtchMessage = tx.runestone_messages.find(m => m.type === 'MINT' || m.type === 'ETCH');
                       if (mintEtchMessage) {
                          action = mintEtchMessage.type === 'MINT' ? 'Minted' : 'Etched';
                          runeName = mintEtchMessage.rune;
                          // Find amount received by user in outputs for mint/etch
                          const userOutput = tx.outputs.find(o => o.address === userAddress && o.rune === runeName);
                          runeAmountRaw = userOutput ? userOutput.rune_amount : 'N/A';
                       } else {
                          // Handle Transfers
                          const userSent = tx.inputs.some(i => i.address === userAddress);
                          const userReceived = tx.outputs.some(o => o.address === userAddress);

                          if (userSent && !userReceived) {
                              action = 'Sent';
                              // Find rune/amount from input involving user
                              const sentInput = tx.inputs.find(i => i.address === userAddress);
                              if (sentInput) {
                                  runeName = sentInput.rune;
                                  runeAmountRaw = sentInput.rune_amount;
                              }
                          } else if (userReceived && !userSent) {
                              action = 'Received';
                              // Find rune/amount from output involving user
                              const receivedOutput = tx.outputs.find(o => o.address === userAddress);
                              if (receivedOutput) {
                                  runeName = receivedOutput.rune;
                                  runeAmountRaw = receivedOutput.rune_amount;
                              }
                          } else if (userSent && userReceived) {
                              action = 'Transferred (Internal?)'; // E.g., sending to self
                              // Try to find relevant rune/amount (might need refinement)
                              const relevantRune = tx.runestone_messages[0]?.rune;
                              const relevantOutput = tx.outputs.find(o => o.address === userAddress && o.rune === relevantRune);
                              if (relevantOutput) {
                                runeName = relevantOutput.rune;
                                runeAmountRaw = relevantOutput.rune_amount;
                              } else {
                                const relevantInput = tx.inputs.find(i => i.address === userAddress && i.rune === relevantRune);
                                if (relevantInput) {
                                    runeName = relevantInput.rune;
                                    runeAmountRaw = relevantInput.rune_amount;
                                }
                              }
                          } else {
                              action = 'Transfer (External)'; // Involved but not sender/receiver?
                              runeName = tx.runestone_messages[0]?.rune || tx.inputs[0]?.rune || 'N/A';
                              runeAmountRaw = 'N/A'; // Hard to determine amount if not direct in/out
                          }
                       }

                      return (
                        <>
                          <div className={styles.txDetailRow}> 
                              <span>Action:</span>
                              <span style={{ fontWeight: 'bold' }}>{action}</span>
                          </div>
                           <div className={styles.txDetailRow}> 
                              <span>Rune:</span>
                              <span className={styles.runeNameHighlight}>{runeName}</span>
                          </div>
                           <div className={styles.txDetailRow}> 
                              <span>Amount (Raw):</span>
                              <span>{runeAmountRaw}</span>
                          </div>
                        </>
                      );
                    })()}
                    {/* --- End Updated TX Details Logic --- */}
                  </div>
                </div>
              ))}
              {/* Add pagination controls here later */} 
            </div>
          )}
        </div>
      )}

      {/* BTC Price Footer */} 
      {activeTab === 'swap' && (
          <div className={styles.btcPriceFooter}>
              <span>BTC Price:</span>
              <span>
                {isBtcPriceLoading
                  ? loadingDots
                  : btcPriceError
                  ? 'Error'
                  : btcPriceUsd
                  ? btcPriceUsd.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                    })
                  : 'N/A'}
              </span>
          </div>
      )}
    </div>
  );
}

// ... Asset type, BTC_ASSET, MOCK_ADDRESS ...

export default SwapInterface;