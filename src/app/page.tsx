'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
      {/* Alpha Version Disclaimer */}
      <div className={styles.disclaimer}>
        <Image 
          src="/icons/msg_warning-0.png" 
          alt="Warning" 
          className={styles.warningIcon}
          width={16}
          height={16}
        />
        This is an alpha version. Use at your own risk.
      </div>

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
