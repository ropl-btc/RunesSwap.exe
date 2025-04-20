'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './AppInterface.module.css';

interface FooterComponentProps {
  btcPriceUsd: number | undefined;
  isBtcPriceLoading: boolean;
  btcPriceError: Error | null;
}

export function FooterComponent({ btcPriceUsd, isBtcPriceLoading, btcPriceError }: FooterComponentProps) {
  return (
    <div className={styles.btcPriceFooter}>
      {isBtcPriceLoading ? (
        <span>Loading BTC price...</span>
      ) : btcPriceError ? (
        <span className={styles.errorText}>Error loading price</span>
      ) : btcPriceUsd ? (
        <span>BTC Price: {btcPriceUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
      ) : (
        <span>BTC Price: N/A</span>
      )}
      <div className={styles.socialLinks}>
        <Link
          href="/docs"
          className={styles.docsButton}
          title="Documentation"
        >
          Docs
        </Link>
        <a
          href="https://github.com/ropl-btc/RunesSwap.app"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub"
          className={styles.socialLink}
        >
          <Image
            src="/icons/github-mark.svg"
            alt="GitHub"
            width={16}
            height={16}
          />
        </a>
        <a
          href="https://twitter.com/robin_liquidium"
          target="_blank"
          rel="noopener noreferrer"
          title="X (Twitter)"
          className={styles.socialLink}
        >
          <Image
            src="/icons/x-logo.svg"
            alt="X (Twitter)"
            width={16}
            height={16}
          />
        </a>
      </div>
    </div>
  );
}

export default FooterComponent;