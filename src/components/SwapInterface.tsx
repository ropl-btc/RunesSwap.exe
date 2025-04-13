'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSharedLaserEyes } from '@/context/LaserEyesContext';
import styles from './SwapInterface.module.css';
import { fetchPopularFromApi, QUERY_KEYS } from '@/lib/apiClient';

// Import the tab components
import SwapTab from './SwapTab';
import RunesInfoTab from './RunesInfoTab';
import YourTxsTab from './YourTxsTab';
import PortfolioTab from './PortfolioTab';
import FooterComponent from './FooterComponent';
import PriceChart from './PriceChart';

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

// --- Props Interface ---
interface SwapInterfaceProps {
  activeTab: 'swap' | 'runesInfo' | 'yourTxs' | 'portfolio';
}
// --- End Props --- 

// --- Component ---
export function SwapInterface({ activeTab }: SwapInterfaceProps) {
  // Get URL parameters
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const preSelectedRune = searchParams.get('rune');

  // Separate state for showing/hiding price chart for each tab
  const [showSwapTabPriceChart, setShowSwapTabPriceChart] = useState(false);
  const [showRunesInfoTabPriceChart, setShowRunesInfoTabPriceChart] = useState(false);
  
  // State for selected assets for each tab
  const [swapTabSelectedAsset, setSwapTabSelectedAsset] = useState(preSelectedRune || "LIQUIDIUM•TOKEN");
  const [runesInfoTabSelectedAsset, setRunesInfoTabSelectedAsset] = useState("LIQUIDIUM•TOKEN");

  // Update swapTabSelectedAsset when preSelectedRune changes
  React.useEffect(() => {
    if (preSelectedRune) {
      setSwapTabSelectedAsset(preSelectedRune);
    }
  }, [preSelectedRune]);

  // LaserEyes hook for wallet info and signing
  const { 
    connected, 
    address, 
    publicKey, 
    paymentAddress, 
    paymentPublicKey, 
    signPsbt
  } = useSharedLaserEyes();

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

  // Fetch popular runes using React Query for caching across tabs
  const {
    data: popularRunes,
    isLoading: isPopularRunesLoading,
    error: popularRunesError
  } = useQuery<Record<string, unknown>[], Error>({
    queryKey: [QUERY_KEYS.POPULAR_RUNES],
    queryFn: () => {
      console.log('[SwapInterface] Fetching popular runes...');
      return fetchPopularFromApi();
    },
    staleTime: Infinity, // Data never goes stale, so React Query won't refetch
    gcTime: 365 * 24 * 60 * 60 * 1000, // Keep in cache for a year
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: false, // Don't retry on failure
  });

  // Handler for toggling the price chart based on active tab
  const togglePriceChart = React.useCallback((assetName?: string, shouldToggle: boolean = true) => {
    if (activeTab === 'swap') {
      if (assetName) {
        setSwapTabSelectedAsset(assetName);
      }
      if (shouldToggle) {
        setShowSwapTabPriceChart(prev => !prev);
      }
    } else if (activeTab === 'runesInfo') {
      if (assetName) {
        setRunesInfoTabSelectedAsset(assetName);
      }
      if (shouldToggle) {
        setShowRunesInfoTabPriceChart(prev => !prev);
      }
    }
  }, [activeTab]);

  // Listen for tabChange events specifically for rune selection
  React.useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent) => {
      const { tab, rune } = event.detail;
      
      if (tab === 'swap' && rune) {
        // Update the swap tab selected asset directly
        setSwapTabSelectedAsset(rune);
        
        // If price chart is visible, update the selected asset there too
        if (showSwapTabPriceChart) {
          togglePriceChart(rune, false);
        }
      }
    };

    window.addEventListener('tabChange', handleTabChangeEvent as EventListener);
    return () => window.removeEventListener('tabChange', handleTabChangeEvent as EventListener);
  }, [showSwapTabPriceChart, togglePriceChart]);

  // Determine if price chart should be shown based on active tab
  const isPriceChartVisible = activeTab === 'swap' ? showSwapTabPriceChart : 
                             activeTab === 'runesInfo' ? showRunesInfoTabPriceChart : 
                             false;
  
  // Get the selected asset for the active tab
  const selectedAssetForActiveTab = activeTab === 'swap' ? swapTabSelectedAsset : 
                                   activeTab === 'runesInfo' ? runesInfoTabSelectedAsset : 
                                   "";
  // Render the active tab content
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'swap':
        return (
          <SwapTab
            connected={connected}
            address={address}
            paymentAddress={paymentAddress}
            publicKey={publicKey}
            paymentPublicKey={paymentPublicKey}
            signPsbt={signPsbt}
            btcPriceUsd={btcPriceUsd}
            isBtcPriceLoading={isBtcPriceLoading}
            btcPriceError={btcPriceError}
            cachedPopularRunes={popularRunes || []}
            isPopularRunesLoading={isPopularRunesLoading}
            popularRunesError={popularRunesError}
            onShowPriceChart={togglePriceChart}
            showPriceChart={showSwapTabPriceChart}
            preSelectedRune={preSelectedRune}
          />
        );
      case 'runesInfo':
        return (
          <RunesInfoTab 
            cachedPopularRunes={popularRunes || []}
            isPopularRunesLoading={isPopularRunesLoading}
            popularRunesError={popularRunesError}
            onShowPriceChart={togglePriceChart}
            showPriceChart={showRunesInfoTabPriceChart}
          />
        );
      case 'yourTxs':
        return <YourTxsTab connected={connected} address={address} />;
      case 'portfolio':
        return <PortfolioTab />;
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.container} ${isPriceChartVisible ? styles.containerWithChart : ''}`}>
      {(activeTab === 'swap' || activeTab === 'runesInfo') ? (
        <div className={styles.appLayout}>
          <div className={`${styles.swapContainer} ${isPriceChartVisible ? styles.narrowSwapContainer : ''}`}>
            {renderActiveTab()}
          </div>
          {isPriceChartVisible && (
            <div className={styles.priceChartContainer}>
              <PriceChart 
                assetName={selectedAssetForActiveTab} 
                onClose={togglePriceChart}
                btcPriceUsd={btcPriceUsd}
              />
            </div>
          )}
        </div>
      ) : (
        renderActiveTab()
      )}
      
      {/* Render footer for all tabs */}
      <FooterComponent 
        btcPriceUsd={btcPriceUsd}
        isBtcPriceLoading={isBtcPriceLoading}
        btcPriceError={btcPriceError}
      />
    </div>
  );
}

export default SwapInterface;