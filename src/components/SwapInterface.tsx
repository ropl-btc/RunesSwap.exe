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
  activeTab: 'swap' | 'runesInfo' | 'yourTxs';
}
// --- End Props --- 

// --- Component ---
export function SwapInterface({ activeTab }: SwapInterfaceProps) {
  // Separate state for showing/hiding price chart for each tab
  const [showSwapTabPriceChart, setShowSwapTabPriceChart] = useState(false);
  const [showRunesInfoTabPriceChart, setShowRunesInfoTabPriceChart] = useState(false);
  
  // State for selected assets for each tab
  const [swapTabSelectedAsset, setSwapTabSelectedAsset] = useState("LIQUIDIUM•TOKEN");
  const [runesInfoTabSelectedAsset, setRunesInfoTabSelectedAsset] = useState("LIQUIDIUM•TOKEN");

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
    queryFn: fetchPopularFromApi,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (use gcTime instead of cacheTime)
  });

  // Handler for toggling the price chart based on active tab
  const togglePriceChart = (assetName?: string) => {
    if (activeTab === 'swap') {
      if (assetName) {
        setSwapTabSelectedAsset(assetName);
      }
      setShowSwapTabPriceChart(!showSwapTabPriceChart);
    } else if (activeTab === 'runesInfo') {
      if (assetName) {
        setRunesInfoTabSelectedAsset(assetName);
      }
      setShowRunesInfoTabPriceChart(!showRunesInfoTabPriceChart);
    }
  };

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