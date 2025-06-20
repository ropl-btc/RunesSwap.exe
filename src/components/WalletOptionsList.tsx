import type { ProviderType } from '@omnisat/lasereyes';
import Image from 'next/image';
import React from 'react';
import styles from './ConnectWalletButton.module.css';

export interface WalletOption {
  name: string;
  provider: ProviderType;
  disclaimer?: string;
}

interface WalletOptionsListProps {
  wallets: WalletOption[];
  onSelect: (provider: ProviderType) => void;
  isConnecting: boolean;
}

const WalletOptionsList: React.FC<WalletOptionsListProps> = ({
  wallets,
  onSelect,
  isConnecting,
}) => (
  <div className={styles.dropdown}>
    {wallets.map(({ name, provider, disclaimer }) => (
      <div key={provider} className={styles.dropdownItemContainer}>
        <button
          onClick={() => onSelect(provider)}
          className={styles.dropdownItem}
          disabled={isConnecting}
        >
          <span>{name}</span>
          {disclaimer && (
            <div
              className={styles.warningIconContainer}
              title={`Warning: ${disclaimer}`}
            >
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
);

export default WalletOptionsList;
