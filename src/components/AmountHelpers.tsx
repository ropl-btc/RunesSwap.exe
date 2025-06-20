import React from 'react';
import styles from './InputArea.module.css';

interface AmountHelpersProps {
  showPercentageShortcuts?: boolean | undefined;
  onPercentageClick: ((percentage: number) => void) | undefined;
  availableBalance?: React.ReactNode | undefined;
  disabled?: boolean | undefined;
}

const AmountHelpers: React.FC<AmountHelpersProps> = ({
  showPercentageShortcuts = false,
  onPercentageClick,
  availableBalance,
  disabled = false,
}) => {
  if (!showPercentageShortcuts && !availableBalance) {
    return null;
  }

  return (
    <span className={styles.availableBalance}>
      {showPercentageShortcuts && onPercentageClick && (
        <span className={styles.percentageShortcuts}>
          <button
            className={styles.percentageButton}
            onClick={() => onPercentageClick(0.25)}
            type="button"
            disabled={disabled}
          >
            25%
          </button>
          {' | '}
          <button
            className={styles.percentageButton}
            onClick={() => onPercentageClick(0.5)}
            type="button"
            disabled={disabled}
          >
            50%
          </button>
          {' | '}
          <button
            className={styles.percentageButton}
            onClick={() => onPercentageClick(0.75)}
            type="button"
            disabled={disabled}
          >
            75%
          </button>
          {' | '}
          <button
            className={styles.percentageButton}
            onClick={() => onPercentageClick(1)}
            type="button"
            disabled={disabled}
          >
            Max
          </button>
          {availableBalance ? ' • ' : ''}
        </span>
      )}
      {availableBalance && <>Available: {availableBalance}</>}
    </span>
  );
};

export default AmountHelpers;
