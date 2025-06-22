import React, { useEffect, useState } from 'react';
import useFeeRates from '@/hooks/useFeeRates';
import styles from './FeeSelector.module.css';

/** Available fee rate options for swap transactions */
export type SwapFeeOption = 'medium' | 'fast' | 'custom';

interface SwapFeeSelectorProps {
  /** Callback function triggered when the fee rate changes */
  onChange: (rate: number) => void;
}

/**
 * SwapFeeSelector component allows users to select fee rates for swap transactions.
 * Provides three options: medium (default), fast, and custom fee rates.
 *
 * @param props - Component props
 * @param props.onChange - Callback triggered when fee rate changes
 * @returns JSX element for fee selection interface
 */
const SwapFeeSelector: React.FC<SwapFeeSelectorProps> = ({ onChange }) => {
  const { data: fees } = useFeeRates();
  const [option, setOption] = useState<SwapFeeOption>('medium');
  const [custom, setCustom] = useState('');
  const [validationError, setValidationError] = useState<string>('');

  const low = fees?.hourFee ?? 1;
  const medium = fees?.halfHourFee ?? low;
  const high = fees?.fastestFee ?? medium;

  useEffect(() => {
    if (!fees) return;
    let rate = medium;
    if (option === 'fast') rate = high;
    else if (option === 'custom') {
      const customRate = parseFloat(custom) || 0;
      if (customRate < medium && custom !== '') {
        setValidationError(
          `Custom fee must be at least ${medium} sats/vB (medium fee)`,
        );
        rate = medium; // Use medium as fallback
      } else {
        setValidationError('');
        rate = Math.max(customRate || medium, medium);
      }
    }
    onChange(rate);
  }, [option, custom, fees, onChange, low, medium, high]);

  /**
   * Handles custom fee input validation and updates the fee rate.
   * Validates that the custom fee meets minimum requirements.
   *
   * @param value - The custom fee value as a string
   */
  const handleCustomChange = (value: string) => {
    setCustom(value);
    if (value === '') {
      setValidationError('');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setValidationError('Please enter a valid number');
    } else if (numValue < medium) {
      setValidationError(
        `Custom fee must be at least ${medium} sats/vB (medium fee)`,
      );
    } else {
      setValidationError('');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.buttonRow}>
        <button
          className={`${styles.feeButton} ${option === 'medium' ? styles.feeButtonActive : ''}`}
          onClick={() => setOption('medium')}
        >
          Medium ({medium} sats/vb)
        </button>
        <button
          className={`${styles.feeButton} ${option === 'fast' ? styles.feeButtonActive : ''}`}
          onClick={() => setOption('fast')}
        >
          Fast ({high} sats/vb)
        </button>
        <button
          className={`${styles.feeButton} ${option === 'custom' ? styles.feeButtonActive : ''}`}
          onClick={() => setOption('custom')}
        >
          Custom
        </button>
      </div>
      {option === 'custom' && (
        <div className={styles.customInputContainer}>
          <div className={styles.customInputWrapper}>
            <input
              className={`${styles.customInput} ${validationError ? styles.customInputError : ''}`}
              type="number"
              min={medium}
              value={custom}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder={`${medium}+`}
            />
            <span className={styles.customInputLabel}>sats/vB</span>
          </div>
          {validationError && (
            <div className={styles.validationError}>{validationError}</div>
          )}
          <div className={styles.customInputHint}>
            Minimum: {medium} sats/vB (medium fee)
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapFeeSelector;
