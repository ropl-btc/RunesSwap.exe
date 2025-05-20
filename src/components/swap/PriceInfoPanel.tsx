import React from "react";
import styles from "./PriceInfoPanel.module.css";
import { Asset } from "@/types/common";

interface PriceInfoPanelProps {
  /**
   * The input asset in the swap
   */
  assetIn: Asset | null;

  /**
   * The output asset in the swap
   */
  assetOut: Asset | null;

  /**
   * Exchange rate between the assets
   */
  exchangeRate: string | null;

  /**
   * Whether a quote is being loaded
   */
  isQuoteLoading: boolean;

  /**
   * Any error that occurred during quoting
   */
  quoteError: string | null;

  /**
   * Debounced input amount for the swap
   */
  debouncedInputAmount: number;

  /**
   * Animation dots for loading states
   */
  loadingDots: string;

  /**
   * Whether to show the price chart
   */
  showPriceChart?: boolean;

  /**
   * Function to show the price chart
   */
  onShowPriceChart?: (assetName?: string, shouldToggle?: boolean) => void;
}

/**
 * Component that displays price information and exchange rate
 */
export const PriceInfoPanel: React.FC<PriceInfoPanelProps> = ({
  assetIn,
  assetOut,
  exchangeRate,
  isQuoteLoading,
  quoteError,
  debouncedInputAmount,
  loadingDots,
  showPriceChart = false,
  onShowPriceChart,
}) => {
  // Helper to determine what text to show for exchange rate
  const getExchangeRateText = () => {
    if (isQuoteLoading) return loadingDots;
    if (exchangeRate) return exchangeRate;
    // Show N/A only if amount entered, but no quote/rate yet and no specific quote error
    if (debouncedInputAmount > 0 && !quoteError) return "N/A";
    return ""; // Otherwise, display nothing
  };

  return (
    <>
      {/* Price Chart Button */}
      {!showPriceChart && onShowPriceChart && (
        <button
          className={styles.showPriceChartButton}
          onClick={() => onShowPriceChart(assetOut?.name || "LIQUIDIUM•TOKEN")}
        >
          Show Price Chart
        </button>
      )}

      {/* Info Area */}
      <div className={styles.infoArea}>
        {assetIn && assetOut && (
          <div className={styles.infoRow}>
            <span>Price:</span>
            <span>{getExchangeRateText()}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default PriceInfoPanel;
