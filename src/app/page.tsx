'use client';

import React, { useState } from 'react';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { SwapInterface } from '@/components/SwapInterface';
import styles from './page.module.css';

// Define the tab type
type ActiveTab = 'swap' | 'runesInfo' | 'yourTxs';

export default function Home() {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('swap');

  return (
    <div className={styles.mainContainer}>
      {/* New Header Container */}
      <div className={styles.headerContainer}>
        {/* Tab Buttons */}
        <div className={styles.tabsInHeader}>
          <button 
            className={`${styles.pageTabButton} ${activeTab === 'swap' ? styles.pageTabActive : ''}`}
            onClick={() => setActiveTab('swap')}
          >
            Swap
          </button>
          <button 
            className={`${styles.pageTabButton} ${activeTab === 'runesInfo' ? styles.pageTabActive : ''}`}
            onClick={() => setActiveTab('runesInfo')}
          >
            Runes Info
          </button>
          <button 
            className={`${styles.pageTabButton} ${activeTab === 'yourTxs' ? styles.pageTabActive : ''}`}
            onClick={() => setActiveTab('yourTxs')}
          >
            Your TXs
          </button>
        </div>

        {/* Connect Wallet Button */}
        <div className={styles.connectButtonContainer}> 
           <ConnectWalletButton />
        </div>
      </div>

      {/* Pass activeTab as a prop */}
      <SwapInterface activeTab={activeTab} />

      {/* Optional: Add other content/components below */}
      {/* <p className="pt-4 text-xs">Status: Ready</p> */}
    </div>
  );
}
