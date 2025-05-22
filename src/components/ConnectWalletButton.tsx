"use client";

import React from "react";
import styles from "./ConnectWalletButton.module.css";
import {
  useWalletConnection,
  AVAILABLE_WALLETS,
} from "@/hooks/useWalletConnection";
import WalletOptionsList from "./WalletOptionsList";

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export function ConnectWalletButton() {
  const {
    connected,
    isConnecting,
    address,
    provider,
    connectionError,
    installLink,
    isDropdownOpen,
    dropdownRef,
    toggleDropdown,
    handleConnect,
    handleDisconnect,
  } = useWalletConnection();

  if (connected && address) {
    const connectedWalletName =
      AVAILABLE_WALLETS.find((w) => w.provider === provider)?.name ||
      provider ||
      "Wallet";
    return (
      <div className={styles.connectedInfo}>
        <span className={styles.connectedText}>
          {connectedWalletName}: {truncateAddress(address)}
        </span>
        <button onClick={handleDisconnect} className={styles.connectButton}>
          Disconnect
        </button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <button className={styles.connectButton} disabled>
        Connecting...
      </button>
    );
  }

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
        <WalletOptionsList
          wallets={AVAILABLE_WALLETS}
          onSelect={handleConnect}
          isConnecting={isConnecting}
        />
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
