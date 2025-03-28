'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWalletStore } from '@/store/walletStore';
// Import all wallet provider constants from LaserEyes
import {
  useLaserEyes,
  UNISAT,
  XVERSE,
  LEATHER,
  OYL,
  MAGIC_EDEN,
  OKX,
  ORANGE,
  PHANTOM,
  WIZZ,
  type ProviderType, // Import the type for provider constants
} from '@omnisat/lasereyes';
import styles from './ConnectWalletButton.module.css'; // Import CSS module

// Helper function to truncate address
const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Define the list of available wallets
const AVAILABLE_WALLETS: { name: string; provider: ProviderType }[] = [
  { name: 'Unisat', provider: UNISAT },
  { name: 'Xverse', provider: XVERSE },
  { name: 'Leather', provider: LEATHER },
  { name: 'OKX', provider: OKX },
  { name: 'Magic Eden', provider: MAGIC_EDEN },
  { name: 'OYL', provider: OYL }, // Assuming OYL is a valid provider constant
  { name: 'Orange', provider: ORANGE }, // Assuming ORANGE is a valid provider constant
  { name: 'Phantom', provider: PHANTOM }, // Assuming PHANTOM is a valid provider constant
  { name: 'Wizz', provider: WIZZ }, // Assuming WIZZ is a valid provider constant
];

export function ConnectWalletButton() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    connect,
    disconnect,
    connected,
    isConnecting,
    address,
    provider,
  } = useLaserEyes();

  const { disconnectWallet: zustandDisconnect } = useWalletStore();

  // Log state changes for debugging
  useEffect(() => {
    console.log('[ConnectWalletButton] State Update:', {
      connected,
      isConnecting,
      address,
      provider,
    });
  }, [connected, isConnecting, address, provider]);

  console.log('[ConnectWalletButton] Rendering with state:', {
    connected,
    isConnecting,
    address,
    isDropdownOpen,
  });

  const handleConnect = async (providerToConnect: ProviderType) => {
    console.log(`[ConnectWalletButton] handleConnect called for: ${providerToConnect}`);
    setIsDropdownOpen(false);
    if (isConnecting) {
      console.log('[ConnectWalletButton] Connection attempt blocked: already connecting.');
      return;
    }
    try {
      console.log(`[ConnectWalletButton] Attempting to connect: ${providerToConnect}`);
      await connect(providerToConnect);
      console.log(`[ConnectWalletButton] Connection successful for: ${providerToConnect}`);
    } catch (error) {
      console.error(`[ConnectWalletButton] Failed to connect ${providerToConnect} wallet:`, error);
    }
  };

  const handleDisconnect = () => {
    console.log('[ConnectWalletButton] handleDisconnect called');
    disconnect();
    zustandDisconnect();
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
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
    console.log('[ConnectWalletButton] Rendering: Connected Info');
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
    console.log('[ConnectWalletButton] Rendering: Connecting Button');
    return (
      <button className={styles.connectButton} disabled>
        Connecting...
      </button>
    );
  }

  // 3. Show connect button and dropdown if not connected AND not connecting.
  console.log('[ConnectWalletButton] Rendering: Connect Button with Dropdown');
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
          {AVAILABLE_WALLETS.map(({ name, provider: walletProvider }) => (
            <button
              key={walletProvider}
              onClick={() => handleConnect(walletProvider)}
              className={styles.dropdownItem}
              disabled={isConnecting}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConnectWalletButton; 