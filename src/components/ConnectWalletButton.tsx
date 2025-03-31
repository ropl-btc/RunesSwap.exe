'use client';

import React, { useState, useEffect, useRef } from 'react';
// Import ONLY the types/constants needed
import {
  UNISAT,
  XVERSE,
  LEATHER,
  OYL,
  MAGIC_EDEN,
  OKX,
  ORANGE,
  PHANTOM,
  WIZZ,
  type ProviderType, 
} from '@omnisat/lasereyes';
import { useSharedLaserEyes } from '@/context/LaserEyesContext'; // Import the shared hook
import styles from './ConnectWalletButton.module.css'; // Import CSS module
import Image from 'next/image';

// Helper function to truncate address
const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Wallet-specific error patterns to identify installation issues
interface WalletErrorPatterns {
  notInstalledPatterns: string[];
  otherPatterns?: {
    [key: string]: string[];
  };
}

const WALLET_ERROR_PATTERNS: Partial<Record<ProviderType, WalletErrorPatterns>> = {
  [UNISAT]: {
    notInstalledPatterns: ['not detected', 'not installed', 'not found']
  },
  [XVERSE]: {
    notInstalledPatterns: ['no bitcoin wallet installed', 'extension not installed', 'is not defined']
  },
  [LEATHER]: {
    notInstalledPatterns: ['leather isn\'t installed']
  },
  [OYL]: {
    notInstalledPatterns: ['oyl isn\'t installed']
  },
  [MAGIC_EDEN]: {
    notInstalledPatterns: ['no bitcoin wallet installed']
  },
  [OKX]: {
    notInstalledPatterns: ['cannot read properties of undefined', 'provider not available']
  },
  [ORANGE]: {
    notInstalledPatterns: ['no orange bitcoin wallet installed']
  },
  [PHANTOM]: {
    notInstalledPatterns: ['phantom isn\'t installed', 'provider unavailable', 'no provider']
  },
  [WIZZ]: {
    notInstalledPatterns: ['wallet is not installed']
  }
};

// Common error patterns for all wallets
const COMMON_ERROR_PATTERNS: string[] = [
  'not installed', 
  'not detected', 
  'not found',
  'provider not available',
  'wallet not found',
  'extension not installed',
  'missing provider',
  'undefined provider',
  'provider unavailable',
  'no provider',
  'cannot find',
  'not connected',
  'is not defined',
  'is undefined',
  'not exist'
];

// Wallet installation links
const WALLET_INSTALL_LINKS: Partial<Record<ProviderType, string>> = {
  [UNISAT]: 'https://unisat.io/download',
  [XVERSE]: 'https://www.xverse.app/download',
  [LEATHER]: 'https://leather.io/install-extension',
  [OYL]: 'https://chromewebstore.google.com/detail/oyl-wallet-bitcoin-ordina/ilolmnhjbbggkmopnemiphomhaojndmb',
  [MAGIC_EDEN]: 'https://wallet.magiceden.io/download',
  [OKX]: 'https://web3.okx.com/en-eu/download',
  [ORANGE]: 'https://chromewebstore.google.com/detail/orange-wallet/glmhbknppefdmpemdmjnjlinpbclokhn?hl=en&authuser=0',
  [PHANTOM]: 'https://phantom.com/download',
  [WIZZ]: 'https://wizzwallet.io/',
};

// Define the list of available wallets
const AVAILABLE_WALLETS: { name: string; provider: ProviderType; disclaimer?: string }[] = [
  { name: 'Xverse', provider: XVERSE },
  { name: 'Unisat', provider: UNISAT },
  { name: 'Leather', provider: LEATHER },
  { name: 'OKX', provider: OKX },
  { name: 'Magic Eden', provider: MAGIC_EDEN },
  { name: 'OYL', provider: OYL },
  { name: 'Orange', provider: ORANGE },
  { name: 'Phantom', provider: PHANTOM, disclaimer: 'Runes are not supported in Phantom wallet. Use with caution.' },
  { name: 'Wizz', provider: WIZZ },
];

export function ConnectWalletButton() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [installLink, setInstallLink] = useState<string | null>(null);

  // Use the shared hook
  const {
    connect,
    disconnect,
    connected,
    isConnecting,
    address,
    provider,
    hasUnisat,
  } = useSharedLaserEyes();

  // Check if wallet is installed before attempting connection
  const checkWalletInstalled = (providerToConnect: ProviderType): boolean => {
    switch (providerToConnect) {
      case UNISAT:
        return hasUnisat || false;
      // Add more cases for other wallets when LaserEyes API provides them
      default:
        // For wallets we can't check, assume they're installed and let the error handling manage it
        return true;
    }
  };

  const handleConnect = async (providerToConnect: ProviderType) => {
    setIsDropdownOpen(false);
    setConnectionError(null);
    setInstallLink(null);
    
    if (isConnecting) {
      return;
    }

    // Get wallet name for messages
    const walletName = AVAILABLE_WALLETS.find(w => w.provider === providerToConnect)?.name || providerToConnect;

    // Check if wallet is installed
    if (!checkWalletInstalled(providerToConnect)) {
      console.log(`[ConnectWalletButton] ${walletName} wallet not installed (detected by hasUnisat check)`);
      setConnectionError(`${walletName} wallet not installed.`);
      setInstallLink(WALLET_INSTALL_LINKS[providerToConnect] || null);
      return;
    }
    
    try {
      console.log(`[ConnectWalletButton] Attempting to connect to ${walletName} wallet...`);
      await connect(providerToConnect);
      console.log(`[ConnectWalletButton] Successfully connected to ${walletName} wallet`);
    } catch (error) {
      // Detailed error logging for debugging
      console.error(`[ConnectWalletButton] Failed to connect ${walletName} wallet:`, error);
      console.log(`[ConnectWalletButton] Error type:`, typeof error);
      console.log(`[ConnectWalletButton] Error is instance of Error:`, error instanceof Error);
      
      if (error instanceof Error) {
        console.log(`[ConnectWalletButton] Error message:`, error.message);
        console.log(`[ConnectWalletButton] Error name:`, error.name);
        console.log(`[ConnectWalletButton] Error stack:`, error.stack);
        
        // Save original error for reference (helpful for identifying new patterns)
        console.log(`[ConnectWalletButton] **SAVE THIS FOR DEBUGGING**: Wallet: ${walletName}, Error: ${error.message}`);
      } else if (typeof error === 'string') {
        console.log(`[ConnectWalletButton] Error string:`, error);
        console.log(`[ConnectWalletButton] **SAVE THIS FOR DEBUGGING**: Wallet: ${walletName}, String Error: ${error}`);
      } else {
        console.log(`[ConnectWalletButton] Stringified error:`, JSON.stringify(error));
        console.log(`[ConnectWalletButton] **SAVE THIS FOR DEBUGGING**: Wallet: ${walletName}, Unknown Error: ${JSON.stringify(error)}`);
      }
      
      // Determine if this is a "wallet not installed" error
      let isWalletNotInstalledError = false;
      let errorMessage = '';
      
      if (error instanceof Error) {
        const errorString = error.message.toLowerCase();
        
        // First check wallet-specific patterns if available
        const walletPatterns = WALLET_ERROR_PATTERNS[providerToConnect];
        if (walletPatterns) {
          // Check against wallet-specific patterns
          isWalletNotInstalledError = walletPatterns.notInstalledPatterns.some(pattern => 
            errorString.includes(pattern.toLowerCase())
          );
          
          console.log(`[ConnectWalletButton] Wallet-specific pattern match for ${walletName}:`, isWalletNotInstalledError);
        }
        
        // If no wallet-specific match, fall back to common patterns
        if (!isWalletNotInstalledError) {
          isWalletNotInstalledError = COMMON_ERROR_PATTERNS.some(pattern => 
            errorString.includes(pattern.toLowerCase())
          );
          
          console.log(`[ConnectWalletButton] Common pattern match:`, isWalletNotInstalledError);
        }
        
        // Log the matched patterns for future refinement
        const matchedPatterns = [
          ...(walletPatterns?.notInstalledPatterns || []),
          ...COMMON_ERROR_PATTERNS
        ].filter(pattern => errorString.includes(pattern.toLowerCase()));
        
        console.log(`[ConnectWalletButton] Matched patterns:`, matchedPatterns);
        
        errorMessage = error.message;
      } else {
        // For non-Error objects, assume they're related to wallet installation
        isWalletNotInstalledError = true;
        errorMessage = 'Wallet provider unavailable';
      }
      
      if (isWalletNotInstalledError) {
        setConnectionError(`${walletName} wallet not installed.`);
        setInstallLink(WALLET_INSTALL_LINKS[providerToConnect] || null);
      } else {
        // Other connection errors
        setConnectionError(`Failed to connect to ${walletName}: ${errorMessage || 'Unknown error'}`);
        setInstallLink(null);
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setConnectionError(null);
    setInstallLink(null);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    // Clear errors when opening/closing dropdown
    setConnectionError(null);
    setInstallLink(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Simplified Render Logic:

  // 1. Show connected info if connected.
  if (connected && address) {
    const connectedWalletName = AVAILABLE_WALLETS.find(w => w.provider === provider)?.name || provider || 'Wallet';
    return (
      <div className={styles.connectedInfo}>
        <span className={styles.connectedText}>{connectedWalletName}: {truncateAddress(address)}</span>
        <button
          onClick={handleDisconnect}
          className={styles.connectButton}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // 2. Show loading button ONLY if actively connecting.
  if (isConnecting) {
    return (
      <button className={styles.connectButton} disabled>
        Connecting...
      </button>
    );
  }

  // 3. Show connect button and dropdown if not connected AND not connecting.
  return (
    <div className={styles.connectContainer} ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={styles.connectButton}
        disabled={isConnecting}
      >
        Connect Wallet
      </button>
      {isDropdownOpen && (
        <div className={styles.dropdown}>
          {AVAILABLE_WALLETS.map(({ name, provider: walletProvider, disclaimer }) => (
            <div key={walletProvider} className={styles.dropdownItemContainer}>
              <button
                onClick={() => handleConnect(walletProvider)}
                className={styles.dropdownItem}
                disabled={isConnecting}
              >
                <span>{name}</span>
                {disclaimer && (
                  <div className={styles.warningIconContainer} title={`Warning: ${disclaimer}`}>
                    <Image 
                      src="/icons/msg_warning-0.png" 
                      alt="Warning" 
                      className={styles.warningIcon} 
                      width={16}
                      height={16}
                    />
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
      {connectionError && (
        <div className={styles.errorMessage}>
          <p>{connectionError}</p>
          {installLink && (
            <a 
              href={installLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.installLink}
            >
              Install Wallet
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default ConnectWalletButton;