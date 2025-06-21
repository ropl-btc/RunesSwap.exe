import Image from 'next/image';
import React from 'react';
import styles from './BorrowTab.module.css';
import Button from './Button';

interface BorrowSuccessMessageProps {
  loanTxId: string | null;
  onViewPortfolio: () => void;
  onStartAnother: () => void;
}

const BorrowSuccessMessage: React.FC<BorrowSuccessMessageProps> = ({
  loanTxId,
  onViewPortfolio,
  onStartAnother,
}) => {
  if (!loanTxId) return null;
  return (
    <div className={`${styles.messageWithIcon} ${styles.successMessage}`}>
      <Image
        src="/icons/check-0.png"
        alt="Success"
        className={styles.messageIcon}
        width={16}
        height={16}
      />
      <div className={styles.successContent}>
        <p className={styles.successTitle}>Loan started successfully!</p>
        <p className={styles.successDetails}>
          Your loan has been initiated. It will appear in your portfolio
          shortly.
        </p>
        <div className={styles.successButtons}>
          <Button
            onClick={onViewPortfolio}
            style={{ marginRight: 'var(--space-2)' }}
          >
            View Portfolio
          </Button>
          <Button onClick={onStartAnother}>Start Another Loan</Button>
        </div>
      </div>
    </div>
  );
};

export default BorrowSuccessMessage;
