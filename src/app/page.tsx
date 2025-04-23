'use client';


import React, { useState } from 'react';
import Image from 'next/image';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { AppInterface } from '@/components/AppInterface';
import styles from './page.module.css';

// Define the tab type
type ActiveTab = 'swap' | 'runesInfo' | 'yourTxs' | 'portfolio';

export default function Home() {
  // Get URL parameters
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const tabParam = searchParams.get('tab') as ActiveTab | null;
  const runeParam = searchParams.get('rune');

  console.log('[Home] URL Parameters:', { tabParam, runeParam });

  // State for the active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam || 'swap');

  // Listen for tab change events
  React.useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const { tab } = event.detail;
      setActiveTab(tab as ActiveTab);
    };

    window.addEventListener('tabChange', handleTabChange as EventListener);
    return () => window.removeEventListener('tabChange', handleTabChange as EventListener);
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', tab);
    // Preserve the rune parameter if it exists and we're switching to swap tab
    const runeParam = searchParams.get('rune');
    if (tab === 'swap' && runeParam) {
      newUrl.searchParams.set('rune', runeParam);
    } else {
      newUrl.searchParams.delete('rune');
    }
    window.history.pushState({}, '', newUrl.toString());
  };

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
            onClick={() => handleTabChange('swap')}
          >
            Swap
          </button>
          <button 
            className={`${styles.pageTabButton} ${activeTab === 'runesInfo' ? styles.pageTabActive : ''}`}
            onClick={() => handleTabChange('runesInfo')}
          >
            Runes Info
          </button>
          <button 
            className={`${styles.pageTabButton} ${activeTab === 'yourTxs' ? styles.pageTabActive : ''}`}
            onClick={() => handleTabChange('yourTxs')}
          >
            Your TXs
          </button>
          <button 
            className={`${styles.pageTabButton} ${activeTab === 'portfolio' ? styles.pageTabActive : ''}`}
            onClick={() => handleTabChange('portfolio')}
          >
            Portfolio
          </button>
        </div>

        {/* Connect Wallet Button */}
        <div className={styles.connectButtonContainer}> 
           <ConnectWalletButton />
        </div>
      </div>

      {/* Pass activeTab as a prop */}
      <AppInterface activeTab={activeTab} />

      {/* Optional: Add other content/components below */}
      {/* <p className="pt-4 text-xs">Status: Ready</p> */}
    </div>
  );
}
