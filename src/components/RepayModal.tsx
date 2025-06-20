import React from 'react';
import Button from './Button';
import styles from './PortfolioTab.module.css';

interface RepayModalProps {
  open: boolean;
  repayAmount: string;
  psbtPreview: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const RepayModal: React.FC<RepayModalProps> = ({
  open,
  repayAmount,
  psbtPreview,
  loading,
  error,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <div
      className={styles.repayModalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="repay-modal-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className={styles.repayModalWindow}>
        <h3 id="repay-modal-title" className="heading">
          Confirm Repayment
        </h3>
        <div>
          Repayment Amount: <b>{repayAmount}</b>
        </div>
        <div
          className="smallText"
          style={{ margin: '8px 0', wordBreak: 'break-all' }}
        >
          PSBT:{' '}
          <code title="Full PSBT (truncated for display)">
            {psbtPreview}...
          </code>
        </div>
        {error && (
          <div className="errorText" style={{ margin: '8px 0' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : 'Sign & Repay'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RepayModal;
