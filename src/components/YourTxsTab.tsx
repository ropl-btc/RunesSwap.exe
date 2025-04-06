'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import styles from './SwapInterface.module.css'; // Reuse styles for now
import { 
  RuneActivityEvent
} from '@/types/ordiscan'; // Import types
import { fetchRuneActivityFromApi } from '@/lib/apiClient'; // Import API functions
import { FormattedRuneAmount } from './FormattedRuneAmount'; // Import component
import { interpretRuneTransaction } from '@/utils/transactionHelpers'; // Import the new utility function

interface YourTxsTabProps {
  connected: boolean;
  address: string | null;
}

export function YourTxsTab({ connected, address }: YourTxsTabProps) {
  // --- Query for User's Rune Transaction Activity ---
  const {
    data: runeActivity,
    isLoading: isRuneActivityLoading,
    error: runeActivityError,
    // Add pagination state/controls later if needed
  } = useQuery<RuneActivityEvent[], Error>({
    queryKey: ['runeActivityApi', address],
    queryFn: () => fetchRuneActivityFromApi(address!), // Use API function
    enabled: !!connected && !!address, // Only fetch when connected and address exists
    staleTime: 60 * 1000, // Stale after 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  return (
    <div className={styles.yourTxsTabContainer}>
      <h2 className={styles.title}>Your Rune Transactions</h2>
      {!connected || !address ? (
        <p className={styles.hintText}>Connect your wallet to view your transactions.</p>
      ) : isRuneActivityLoading ? (
        <div className={styles.listboxLoadingOrEmpty}>
          <span className={styles.loadingText}>Loading your transactions...</span>
        </div>
      ) : runeActivityError ? (
        <div className={`${styles.listboxError} ${styles.messageWithIcon}`}>
          <Image 
            src="/icons/msg_error-0.png" 
            alt="Error" 
            className={styles.messageIcon} 
            width={16}
            height={16}
          />
          <span>Error loading transactions: {runeActivityError instanceof Error ? runeActivityError.message : String(runeActivityError)}</span>
        </div>
      ) : !runeActivity || runeActivity.length === 0 ? (
        <p className={styles.hintText}>No recent rune transactions found for this address.</p>
      ) : (
        <div className={styles.txListContainer}> 
          {runeActivity.map((tx: RuneActivityEvent) => {
            // Get transaction interpretation using the utility function
            const { action, runeName, runeAmountRaw } = address 
              ? interpretRuneTransaction(tx, address) 
              : { action: 'Unknown', runeName: 'N/A', runeAmountRaw: 'N/A' };
              
            return (
              <div key={tx.txid} className={styles.txListItem}>
                <div className={styles.txHeader}>
                  <a
                    href={`https://ordiscan.com/tx/${tx.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.txLinkBold}
                  >
                    TXID: {tx.txid.substring(0, 8)}...{tx.txid.substring(tx.txid.length - 8)}
                  </a>
                  <span className={styles.txTimestamp}>
                    {new Date(tx.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className={styles.txDetails}> 
                  <div className={styles.txDetailRow}> 
                    <span>Action:</span>
                    <span style={{ fontWeight: 'bold' }}>{action}</span>
                  </div>
                  <div className={styles.txDetailRow}> 
                    <span>Rune:</span>
                    <span className={styles.runeNameHighlight}>{runeName}</span>
                  </div>
                  <div className={styles.txDetailRow}> 
                    <span>Amount:</span>
                    <span>
                      <FormattedRuneAmount runeName={runeName} rawAmount={runeAmountRaw} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default YourTxsTab; 