'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSharedLaserEyes } from '@/context/LaserEyesContext';
import styles from './SwapInterface.module.css';

// Import the tab components
import SwapTab from './SwapTab';
import RunesInfoTab from './RunesInfoTab';
import YourTxsTab from './YourTxsTab';

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

  return (
    <div className={styles.container}> 
      {(() => {
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
              />
            );
          case 'runesInfo':
            return <RunesInfoTab />;
          case 'yourTxs':
            return <YourTxsTab connected={connected} address={address} />;
          default:
            return null;
        }
      })()}
    </div>
  );
}

export default SwapInterface;