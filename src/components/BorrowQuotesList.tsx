import React from "react";
import styles from "./BorrowTab.module.css";
import { LiquidiumBorrowQuoteOffer } from "@/lib/apiClient";

interface BorrowQuotesListProps {
  quotes: LiquidiumBorrowQuoteOffer[];
  selectedQuoteId: string | null;
  onSelectQuote: (id: string) => void;
}

const BorrowQuotesList: React.FC<BorrowQuotesListProps> = ({
  quotes,
  selectedQuoteId,
  onSelectQuote,
}) => {
  const formattedQuotes = quotes.map((quote) => {
    const principalBtc = (quote.loan_breakdown.principal_sats / 1e8).toFixed(8);
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
    const ltvPercent = Number(quote.ltv_rate).toFixed(2);
    const dueDate = new Date(
      quote.loan_breakdown.loan_due_by_date,
    ).toLocaleDateString();
    return {
      ...quote,
      principalBtc,
      repaymentBtc,
      interestPercent,
      ltvPercent,
      dueDate,
    };
  });

  return (
    <div
      className={styles.infoArea}
      style={{ marginTop: "var(--space-4)", borderTop: "none" }}
    >
      <h2
        className="heading"
        style={{
          fontSize: "var(--font-size-normal)",
          marginBottom: "var(--space-2)",
        }}
      >
        Available Loan Offers:
      </h2>
      {formattedQuotes.map((quote) => (
        <div
          key={quote.offer_id}
          onClick={() => onSelectQuote(quote.offer_id)}
          style={{
            border:
              selectedQuoteId === quote.offer_id
                ? "2px solid var(--win98-blue)"
                : "2px solid var(--win98-gray)",
            padding: "var(--space-2)",
            marginBottom: "var(--space-2)",
            cursor: "pointer",
            backgroundColor:
              selectedQuoteId === quote.offer_id
                ? "var(--win98-light-gray)"
                : "var(--win98-white)",
          }}
          className={styles.inputArea}
        >
          <p>
            <strong>Loan Amount:</strong> {quote.principalBtc} BTC
          </p>
          <p>
            <strong>LTV:</strong> {quote.ltvPercent}%
          </p>
          <p>
            <strong>Term:</strong> {quote.loan_term_days ?? "N/A"} days
          </p>
          <p>
            <strong>Interest:</strong> {quote.interestPercent}% (
            {quote.loan_breakdown.interest_sats} sats)
          </p>
          <p>
            <strong>Total Repayment:</strong> {quote.repaymentBtc} BTC
          </p>
          <p>
            <strong>Due:</strong> {quote.dueDate}
          </p>
        </div>
      ))}
    </div>
  );
};

export default BorrowQuotesList;
