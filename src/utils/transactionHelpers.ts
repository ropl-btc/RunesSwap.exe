import { 
  RuneActivityEvent, 
  RunestoneMessage, 
  RunicInput, 
  RunicOutput 
} from '@/types/ordiscan';

/**
 * Result of interpreting a Rune transaction
 */
export interface RuneTransactionInterpretation {
  /** The type of action (Minted, Etched, Sent, Received, etc.) */
  action: string;
  /** The name of the Rune involved in the transaction */
  runeName: string;
  /** The raw amount of the Rune involved in the transaction */
  runeAmountRaw: string;
}

/**
 * Interprets a Rune transaction to determine the action, involved Rune and amount
 * 
 * @param tx - The Rune transaction event data
 * @param userAddress - The address of the current user
 * @returns An object containing the interpreted action, Rune name, and amount
 * 
 * @remarks
 * This function handles several transaction types:
 * 
 * 1. Minting or Etching - When a new Rune is created or minted
 * 2. Sending - When the user sends Runes to another address
 * 3. Receiving - When the user receives Runes from another address
 * 4. Internal Transfer - When the user sends Runes to themselves or consolidates UTXOs
 * 5. External Transfer - When the transaction involves Runes but the user is not directly involved
 */
export function interpretRuneTransaction(
  tx: RuneActivityEvent, 
  userAddress: string
): RuneTransactionInterpretation {
  let action = 'Unknown';
  let runeName = 'N/A';
  let runeAmountRaw = 'N/A';

  try {
    // Check for MINT or ETCH message types first
    const mintEtchMessage = tx.runestone_messages.find(
      (m: RunestoneMessage) => m.type === 'MINT' || m.type === 'ETCH'
    );
    
    if (mintEtchMessage) {
      // Case 1: This is a minting or etching transaction
      action = mintEtchMessage.type === 'MINT' ? 'Minted' : 'Etched';
      runeName = mintEtchMessage.rune;
      const userOutput = tx.outputs.find(
        (o: RunicOutput) => o.address === userAddress && o.rune === runeName
      );
      runeAmountRaw = userOutput ? userOutput.rune_amount : 'N/A';
    } else {
      // Determine if user sent or received runes
      const userSent = tx.inputs.some((i: RunicInput) => i.address === userAddress);
      const userReceived = tx.outputs.some((o: RunicOutput) => o.address === userAddress);

      if (userSent && !userReceived) {
        // Case 2: User only sent runes (no change back)
        action = 'Sent';
        const sentInput = tx.inputs.find((i: RunicInput) => i.address === userAddress);
        if (sentInput) {
          runeName = sentInput.rune;
          runeAmountRaw = sentInput.rune_amount;
        }
      } else if (userReceived && !userSent) {
        // Case 3: User only received runes
        action = 'Received';
        const receivedOutput = tx.outputs.find((o: RunicOutput) => o.address === userAddress);
        if (receivedOutput) {
          runeName = receivedOutput.rune;
          runeAmountRaw = receivedOutput.rune_amount;
        }
      } else if (userSent && userReceived) {
        // Case 4: User both sent and received runes
        // This could be sending with change, or an internal transfer/consolidation
        
        // Check if user sent runes to another address
        const sentOutput = tx.outputs.find(
          (o: RunicOutput) => 
            o.address !== userAddress && 
            o.rune && 
            parseFloat(o.rune_amount) > 0
        );

        if (sentOutput) {
          // Found an output sending runes to another address - this is a Send
          action = 'Sent';
          runeName = sentOutput.rune;
          runeAmountRaw = sentOutput.rune_amount;
        } else {
          // No runes sent externally, but user is sender & receiver.
          // This is an Internal Transfer (e.g., UTXO consolidation)
          action = 'Internal Transfer';
          
          // Try to find the relevant rune from the runestone message
          const relevantRune = tx.runestone_messages[0]?.rune;
          const userOutput = tx.outputs.find(
            (o: RunicOutput) => o.address === userAddress && o.rune === relevantRune
          );
          
          if (userOutput) {
            runeName = userOutput.rune;
            runeAmountRaw = userOutput.rune_amount;
          } else {
            // Fallback: Look for any rune output back to the user
            const anyUserOutput = tx.outputs.find(
              (o: RunicOutput) => 
                o.address === userAddress && 
                o.rune && 
                parseFloat(o.rune_amount) > 0
            );
            
            if (anyUserOutput) {
              runeName = anyUserOutput.rune;
              runeAmountRaw = anyUserOutput.rune_amount;
            } else {
              // If still nothing, use input info or default to N/A
              runeName = relevantRune || 
                tx.inputs.find(
                  (i: RunicInput) => i.address === userAddress && i.rune
                )?.rune || 
                'N/A';
              runeAmountRaw = 'N/A'; // Can't reliably determine amount
            }
          }
        }
      } else {
        // Case 5: User was not involved as sender or receiver
        // This might be an external event related to a rune they watch
        action = 'Transfer (External)';
        
        // Try to find any rune involved in the transaction
        runeName = tx.runestone_messages[0]?.rune || 
          tx.inputs.find((i: RunicInput) => i.rune)?.rune || 
          tx.outputs.find((o: RunicOutput) => o.rune)?.rune || 
          'N/A';
        runeAmountRaw = 'N/A'; // Amount for external transfers is ambiguous
      }
    }
  } catch (error) {
    console.error('Error interpreting rune transaction:', error);
    // Default values will be returned
  }

  return { action, runeName, runeAmountRaw };
} 