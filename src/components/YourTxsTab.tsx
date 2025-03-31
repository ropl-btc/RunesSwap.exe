'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import styles from './SwapInterface.module.css'; // Reuse styles for now
import { 
  RuneActivityEvent, 
  RunestoneMessage, 
  RunicInput, 
  RunicOutput 
} from '@/types/ordiscan'; // Import types
import { fetchRuneActivityFromApi } from '@/lib/apiClient'; // Import API functions
import { FormattedRuneAmount } from './FormattedRuneAmount'; // Import component

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
          {runeActivity.map((tx: RuneActivityEvent) => (
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
                {(() => {
                  let action = 'Unknown';
                  let runeName = 'N/A';
                  let runeAmountRaw = 'N/A';
                  const userAddress = address;

                  const mintEtchMessage = tx.runestone_messages.find((m: RunestoneMessage) => m.type === 'MINT' || m.type === 'ETCH');
                  if (mintEtchMessage) {
                    action = mintEtchMessage.type === 'MINT' ? 'Minted' : 'Etched';
                    runeName = mintEtchMessage.rune;
                    const userOutput = tx.outputs.find((o: RunicOutput) => o.address === userAddress && o.rune === runeName);
                    runeAmountRaw = userOutput ? userOutput.rune_amount : 'N/A';
                  } else {
                    const userSent = tx.inputs.some((i: RunicInput) => i.address === userAddress);
                    const userReceived = tx.outputs.some((o: RunicOutput) => o.address === userAddress);

                    if (userSent && !userReceived) {
                      action = 'Sent';
                      const sentInput = tx.inputs.find((i: RunicInput) => i.address === userAddress);
                      if (sentInput) {
                        runeName = sentInput.rune;
                        runeAmountRaw = sentInput.rune_amount;
                      }
                    } else if (userReceived && !userSent) {
                      action = 'Received';
                      const receivedOutput = tx.outputs.find((o: RunicOutput) => o.address === userAddress);
                      if (receivedOutput) {
                        runeName = receivedOutput.rune;
                        runeAmountRaw = receivedOutput.rune_amount;
                      }
                    } else if (userSent && userReceived) {
                      // User sent runes and received change back OR consolidated UTXOs
                      const sentOutput = tx.outputs.find((o: RunicOutput) => o.address !== userAddress && o.rune && parseFloat(o.rune_amount) > 0);

                      if (sentOutput) {
                        // Found an output sending runes to another address - this is the primary action
                        action = 'Sent';
                        runeName = sentOutput.rune;
                        runeAmountRaw = sentOutput.rune_amount;
                      } else {
                        // No runes sent externally, but user is sender & receiver.
                        // Label as 'Internal Transfer' and show amount received back by user.
                        action = 'Internal Transfer'; 
                        const relevantRune = tx.runestone_messages[0]?.rune; 
                        const userOutput = tx.outputs.find((o: RunicOutput) => o.address === userAddress && o.rune === relevantRune);
                        
                        if (userOutput) {
                          runeName = userOutput.rune;
                          runeAmountRaw = userOutput.rune_amount;
                        } else {
                          // Fallback: Look for *any* rune output back to the user
                          const anyUserOutput = tx.outputs.find((o: RunicOutput) => o.address === userAddress && o.rune && parseFloat(o.rune_amount) > 0);
                          if (anyUserOutput) {
                            runeName = anyUserOutput.rune;
                            runeAmountRaw = anyUserOutput.rune_amount;
                          } else {
                            // If still nothing, default to N/A or use input info cautiously
                            runeName = relevantRune || tx.inputs.find((i: RunicInput) => i.address === userAddress && i.rune)?.rune || 'N/A';
                            runeAmountRaw = 'N/A'; // Can't reliably determine amount received back
                          }
                        }
                      }
                    } else {
                      // User was not involved as sender or receiver of runes in inputs/outputs
                      // This might be an external event related to a rune they watch, or just BTC tx.
                      action = 'Transfer (External)'; 
                      // Try to find *any* rune involved in the transaction
                      runeName = tx.runestone_messages[0]?.rune || tx.inputs.find((i: RunicInput) => i.rune)?.rune || tx.outputs.find((o: RunicOutput) => o.rune)?.rune || 'N/A';
                      runeAmountRaw = 'N/A'; // Amount for external transfers is ambiguous
                    }
                  }

                  return (
                    <>
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
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default YourTxsTab; 