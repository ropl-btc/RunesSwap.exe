'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash.debounce';
import Image from 'next/image';
import styles from './SwapInterface.module.css'; // Reuse styles for now
import { 
  type RuneInfo as OrdiscanRuneInfo,
  type RuneMarketInfo as OrdiscanRuneMarketInfo
} from '@/types/ordiscan'; // Import types
import { 
  fetchRuneInfoFromApi, 
  fetchRuneMarketFromApi,
  fetchRunesFromApi,
  fetchPopularFromApi
} from '@/lib/apiClient'; // Import API functions
import { formatNumberString, truncateTxid } from '@/utils/formatters'; // Import utils
import { FormattedRuneAmount } from './FormattedRuneAmount'; // Import component
import type { Rune } from '@/types/satsTerminal';
import { useRunesInfoStore } from '@/store/runesInfoStore'; // Import the store

interface RunesInfoTabProps {
  // Optional props for cached popular runes
  cachedPopularRunes?: Record<string, unknown>[];
  isPopularRunesLoading?: boolean;
  popularRunesError?: Error | null;
  // New props for price chart
  onShowPriceChart?: (assetName?: string) => void;
  showPriceChart?: boolean;
}

export function RunesInfoTab({ 
  cachedPopularRunes = [],
  isPopularRunesLoading = false,
  popularRunesError = null,
  onShowPriceChart,
  showPriceChart = false
}: RunesInfoTabProps) {
  // --- Get state from zustand store ---
  const { 
    selectedRuneInfo: persistedSelectedRuneInfo, 
    runeSearchQuery: persistedRuneSearchQuery, 
    setSelectedRuneInfo, 
    setRuneSearchQuery 
  } = useRunesInfoStore();
  
  // --- Local state and hooks ---
  // Use persisted values for initial state
  const [runeInfoSearchQuery, setLocalRuneInfoSearchQuery] = useState(persistedRuneSearchQuery);
  const [selectedRuneForInfo, setLocalSelectedRuneForInfo] = useState<OrdiscanRuneInfo | null>(persistedSelectedRuneInfo);
  
  // New states for SatsTerminal search
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Rune[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // States for popular runes
  const [isPopularLoading, setIsPopularLoading] = useState(isPopularRunesLoading);
  const [popularRunes, setPopularRunes] = useState<Rune[]>([]);
  const [popularError, setPopularError] = useState<string | null>(
    popularRunesError ? popularRunesError.message : null
  );

  // Query for Selected Rune Details (for details pane)
  const {
    data: detailedRuneInfo, 
    isLoading: isDetailedRuneInfoLoading,
    error: detailedRuneInfoError,
  } = useQuery<OrdiscanRuneInfo | null, Error>({
    queryKey: ['runeInfoApi', selectedRuneForInfo?.name], 
    queryFn: () => selectedRuneForInfo ? fetchRuneInfoFromApi(selectedRuneForInfo.name) : Promise.resolve(null),
    enabled: !!selectedRuneForInfo,
    staleTime: Infinity
  });

  // Query for Selected Rune Market Info
  const {
    data: runeMarketInfo,
    isLoading: isRuneMarketInfoLoading,
    error: runeMarketInfoError,
  } = useQuery<OrdiscanRuneMarketInfo | null, Error>({
    queryKey: ['runeMarketApi', selectedRuneForInfo?.name],
    queryFn: () => selectedRuneForInfo ? fetchRuneMarketFromApi(selectedRuneForInfo.name) : Promise.resolve(null),
    enabled: !!selectedRuneForInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch popular runes on mount using SatsTerminal API
  useEffect(() => {
    const fetchPopular = async () => {
      // If we already have cached popular runes, use them instead of fetching again
      if (cachedPopularRunes && cachedPopularRunes.length > 0) {
        const liquidiumToken: Rune = {
          id: 'liquidiumtoken',
          name: 'LIQUIDIUM•TOKEN',
          imageURI: 'https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN',
        };

        // Map the cached data to Rune format
        const fetchedRunes: Rune[] = cachedPopularRunes
          .map((collection: Record<string, unknown>) => ({
            id: collection?.rune as string || `unknown_${Math.random()}`,
            name: ((collection?.etching as Record<string, unknown>)?.runeName as string) || collection?.rune as string || 'Unknown',
            imageURI: collection?.icon_content_url_data as string || collection?.imageURI as string,
          }))
          .filter(rune => rune.id !== liquidiumToken.id && rune.name !== liquidiumToken.name);

        // Prepend the hardcoded token
        setPopularRunes([liquidiumToken, ...fetchedRunes]);
        setIsPopularLoading(false);
        return;
      }
      
      // If no cached data, fetch from API
      setIsPopularLoading(true);
      setPopularError(null);
      setPopularRunes([]);
      try {
        // Define the hardcoded asset (using Rune type for consistency in this tab)
        const liquidiumToken: Rune = {
          id: 'liquidiumtoken', // Use a consistent ID
          name: 'LIQUIDIUM•TOKEN',
          imageURI: 'https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN',
          // Add other Rune fields if necessary based on your Rune type definition
        };

        const response = await fetchPopularFromApi();
        let mappedRunes: Rune[] = [];

        if (!Array.isArray(response)) {
          // Even if fetch fails or returns non-array, still show Liquidium
          mappedRunes = [liquidiumToken];
        } else {
          const fetchedRunes: Rune[] = response
            .map((collection: Record<string, unknown>) => ({
              id: collection?.rune as string || `unknown_${Math.random()}`,
              name: ((collection?.etching as Record<string, unknown>)?.runeName as string) || collection?.rune as string || 'Unknown',
              imageURI: collection?.icon_content_url_data as string || collection?.imageURI as string,
              // Map other Rune fields if necessary
            }))
            // Filter out any existing liquidium token from the API result
            .filter(rune => rune.id !== liquidiumToken.id && rune.name !== liquidiumToken.name);

          // Prepend the hardcoded token
          mappedRunes = [liquidiumToken, ...fetchedRunes];
        }
        
        setPopularRunes(mappedRunes);

      } catch (error) {
        console.error("Error fetching popular runes:", error);
        setPopularError(error instanceof Error ? error.message : 'Failed to fetch popular runes');
        // Still show Liquidium even on error
         const liquidiumTokenOnError: Rune = {
          id: 'liquidiumtoken',
          name: 'LIQUIDIUM•TOKEN',
          imageURI: 'https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN',
        };
        setPopularRunes([liquidiumTokenOnError]);
      } finally {
        setIsPopularLoading(false);
      }
    };
    fetchPopular();
  }, [cachedPopularRunes]);

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
        const results: Rune[] = await fetchRunesFromApi(query);
        setSearchResults(results);
      } catch (error: unknown) {
        console.error("[RunesInfoTab] Error searching runes:", error);
        setSearchError(error instanceof Error ? error.message : 'Failed to search');
        setSearchResults([]);
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
    setLocalRuneInfoSearchQuery(query);
    setRuneSearchQuery(query); // Update global store
    setIsSearching(true); // Indicate searching immediately
    debouncedSearch(query);
  };

  // Determine which runes to display
  const availableRunes = runeInfoSearchQuery.trim() ? searchResults : popularRunes;
  const isLoadingRunes = runeInfoSearchQuery.trim() ? isSearching : isPopularLoading;
  const currentRunesError = runeInfoSearchQuery.trim() ? searchError : popularError;

  // Update global store when detailed info changes
  useEffect(() => {
    if (detailedRuneInfo) {
      setSelectedRuneInfo(detailedRuneInfo);
    } else if (detailedRuneInfoError && selectedRuneForInfo) {
      // On error, use the minimal info in the global store
      setSelectedRuneInfo(selectedRuneForInfo);
    }
  }, [detailedRuneInfo, detailedRuneInfoError, selectedRuneForInfo, setSelectedRuneInfo]);

  // Handle rune selection
  const handleRuneSelect = (rune: Rune) => {
    // Create minimal rune info for immediate UI feedback
    const minimalRuneInfo = {
      id: rune.id,
      name: rune.name,
      formatted_name: rune.name,
      symbol: rune.name.split('•')[0] || rune.name,
      decimals: 0, 
      number: 0, 
      etching_txid: '',
      premined_supply: '0',
      current_supply: '0',
    } as OrdiscanRuneInfo;

    // Update local state with minimal info
    setLocalSelectedRuneForInfo(minimalRuneInfo);
  };

  return (
    <div className={styles.runesInfoTabContainer}>
      <div className={styles.searchAndResultsContainer}>
        <div className={styles.searchContainerRunesInfo}>
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
              value={runeInfoSearchQuery}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>
        </div>
        
        <div className={styles.runesListContainer}>
          {isLoadingRunes && (
            <div className={styles.listboxLoadingOrEmpty}>
              {runeInfoSearchQuery.trim() 
                ? `Searching for "${runeInfoSearchQuery}"...` 
                : 'Loading Latest Runes...'}
            </div>
          )}
          {currentRunesError && (
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
              {runeInfoSearchQuery.trim() 
                ? `Rune "${runeInfoSearchQuery}" not found.` 
                : 'No recent runes found'}
            </div>
          )}
          {!isLoadingRunes && !currentRunesError && availableRunes.map((rune) => (
            <button 
              key={rune.id}
              className={`${styles.runeListItem} ${selectedRuneForInfo?.name === rune.name ? styles.runeListItemSelected : ''}`}
              onClick={() => handleRuneSelect(rune)}
            >
              <div className={styles.runeListItemContent}>
                {rune.imageURI && (
                  <Image 
                    src={rune.imageURI} 
                    alt="" 
                    className={styles.runeImage}
                    width={24}
                    height={24}
                    onError={(e) => {
                      // Handle error in Next Image component by setting display to none
                      const target = e.target as HTMLImageElement;
                      if (target) {
                        target.style.display = 'none';
                      }
                    }}
                  />
                )}
                <span>{rune.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <div className={styles.searchAndResultsContainer}>
        <div className={`${styles.runeDetailsContainer} ${showPriceChart ? styles.narrowRightPanel : ''}`}>
          {isDetailedRuneInfoLoading && selectedRuneForInfo && <p>Loading details for {selectedRuneForInfo.formatted_name}...</p>}
          {detailedRuneInfoError && selectedRuneForInfo && <p className={styles.errorText}>Error loading details: {detailedRuneInfoError.message}</p>}
          {!isDetailedRuneInfoLoading && detailedRuneInfo && (
            <div>
              <h3>{detailedRuneInfo.formatted_name} ({detailedRuneInfo.symbol})</h3>
              <p><strong>ID:</strong> {detailedRuneInfo.id}</p>
              <p><strong>Number:</strong> {detailedRuneInfo.number}</p>
              <p><strong>Decimals:</strong> {detailedRuneInfo.decimals}</p>
              <p>
                <strong>Etching Tx:</strong> {detailedRuneInfo.etching_txid ? 
                  <a 
                    href={`https://ordiscan.com/tx/${detailedRuneInfo.etching_txid}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.etchingTxLink}
                  >
                    {truncateTxid(detailedRuneInfo.etching_txid)}
                  </a>
                : 'N/A'
                }
              </p>
              {/* Price Information */}
              {runeMarketInfo && (
                <>
                  <p><strong>Price:</strong> <span className={styles.priceHighlight}>{runeMarketInfo.price_in_usd.toFixed(6)} USD</span> ({runeMarketInfo.price_in_sats.toFixed(2)} sats)</p>
                  <p><strong>Market Cap:</strong> {runeMarketInfo.market_cap_in_usd.toLocaleString()} USD</p>
                </>
              )}
              {isRuneMarketInfoLoading && (
                <p><strong>Price:</strong> <span className={styles.loadingText}>Loading market data...</span></p>
              )}
              {runeMarketInfoError && (
                <p><strong>Price:</strong> <span className={styles.errorText}>Market data unavailable: {runeMarketInfoError.message}</span></p>
              )}
              <p><strong>Premined Supply:</strong> 
                <FormattedRuneAmount 
                  runeName={detailedRuneInfo.name} 
                  rawAmount={detailedRuneInfo.premined_supply} 
                />
              </p>
              <p><strong>Total Supply:</strong> {detailedRuneInfo.current_supply !== undefined ? 
                <FormattedRuneAmount 
                  runeName={detailedRuneInfo.name} 
                  rawAmount={detailedRuneInfo.current_supply} 
                />
                : 'N/A'
              }</p>
              {/* Use FormattedRuneAmount for Amount/Mint */}
              {detailedRuneInfo.amount_per_mint !== null && detailedRuneInfo.amount_per_mint !== undefined && 
                <p><strong>Amount/Mint:</strong> 
                  <FormattedRuneAmount 
                    runeName={detailedRuneInfo.name} 
                    rawAmount={detailedRuneInfo.amount_per_mint}
                  />
                </p>
              }
              {/* Keep using formatNumberString for mint_count_cap as it doesn't inherently have decimals */}
              {detailedRuneInfo.mint_count_cap && <p><strong>Mint Cap:</strong> {formatNumberString(detailedRuneInfo.mint_count_cap)}</p>}
              {detailedRuneInfo.mint_start_block !== null && <p><strong>Mint Start Block:</strong> {detailedRuneInfo.mint_start_block}</p>}
              {detailedRuneInfo.mint_end_block !== null && <p><strong>Mint End Block:</strong> {detailedRuneInfo.mint_end_block}</p>}
              {detailedRuneInfo.current_mint_count !== undefined && <p><strong>Current Mint Count:</strong> {detailedRuneInfo.current_mint_count.toLocaleString()}</p>}
              
              {/* Add Price Chart Button */}
              {onShowPriceChart && (
                <div className={styles.showPriceChartButtonContainer}>
                  <button 
                    className={styles.showPriceChartButton}
                    onClick={() => onShowPriceChart(detailedRuneInfo.name)}
                  >
                    {showPriceChart ? 'Hide Price Chart' : 'Show Price Chart'}
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Display hint only if no rune is selected and not currently loading */}
          {!selectedRuneForInfo && !isDetailedRuneInfoLoading && (
            <p className={styles.hintText}>Select a rune from the list or search by name.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RunesInfoTab;