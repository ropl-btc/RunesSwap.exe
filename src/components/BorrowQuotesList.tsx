import React from "react";
import styles from "./BorrowTab.module.css";
import { LiquidiumBorrowQuoteOffer } from "@/lib/api";

interface BorrowQuotesListProps {
  quotes: LiquidiumBorrowQuoteOffer[];
  selectedQuoteId: string | null;
  onSelectQuote: (id: string) => void;
}

const BorrowQuotesList: React.FC<BorrowQuotesListProps> = ({
  quotes,
  selectedQuoteId,
  onSelectQuote,
}) => (
  <div className={styles.quotesContainer}>
    <h2 className={styles.quotesTitle}>Available Loan Offers:</h2>
    {quotes.map((quote) => {
      const principalBtc = (quote.loan_breakdown.principal_sats / 1e8).toFixed(
        8,
      );
      const repaymentBtc = (
        quote.loan_breakdown.total_repayment_sats / 1e8
      ).toFixed(8);
      const interestPercent =
        quote.loan_breakdown.principal_sats > 0
          ? (
              (quote.loan_breakdown.interest_sats /
                quote.loan_breakdown.principal_sats) *
              100
            ).toFixed(2)
          : "0.00";
      return (
        <div
          key={quote.offer_id}
          onClick={() => onSelectQuote(quote.offer_id)}
          className={`${styles.quoteCard} ${
            selectedQuoteId === quote.offer_id ? styles.selected : ""
          }`}
        >
          <div className={styles.quoteGrid}>
            <div className={styles.quoteField}>
              <span className={styles.quoteLabel}>Loan Amount</span>
              <span
                className={`${styles.quoteValue} ${styles.quoteValueHighlight}`}
              >
                {principalBtc} BTC
              </span>
            </div>
            <div className={styles.quoteField}>
              <span className={styles.quoteLabel}>LTV</span>
              <span className={styles.quoteValue}>
                {(Number(quote.ltv_rate) * 100).toFixed(2)}%
              </span>
            </div>
            <div className={styles.quoteField}>
              <span className={styles.quoteLabel}>Term</span>
              <span className={styles.quoteValue}>
                {quote.loan_term_days ?? "N/A"} days
              </span>
            </div>
            <div className={styles.quoteField}>
              <span className={styles.quoteLabel}>Interest Rate</span>
              <span className={styles.quoteValue}>{interestPercent}%</span>
            </div>
            <div className={styles.quoteField}>
              <span className={styles.quoteLabel}>Total Repayment</span>
              <span className={styles.quoteValue}>{repaymentBtc} BTC</span>
            </div>
            <div className={styles.quoteField}>
              <span className={styles.quoteLabel}>Due Date</span>
              <span className={styles.quoteValue}>
                {new Date(
                  quote.loan_breakdown.loan_due_by_date,
                ).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

export default BorrowQuotesList;
