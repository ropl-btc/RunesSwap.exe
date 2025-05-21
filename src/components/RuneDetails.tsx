"use client";

import React from "react";
import styles from "./RunesInfoTab.module.css";
import { FormattedRuneAmount } from "./FormattedRuneAmount";
import { formatNumberString, truncateTxid } from "@/utils/formatters";
import type {
  RuneInfo as OrdiscanRuneInfo,
  RuneMarketInfo as OrdiscanRuneMarketInfo,
} from "@/types/ordiscan";
import type { RuneData } from "@/lib/runesData";

interface RuneDetailsProps {
  selectedRune: OrdiscanRuneInfo | null;
  detailedRuneInfo: RuneData | null;
  detailedRuneInfoError: Error | null;
  isDetailedRuneInfoLoading: boolean;
  runeMarketInfo: OrdiscanRuneMarketInfo | null;
  isRuneMarketInfoLoading: boolean;
  runeMarketInfoError: Error | null;
  showLoading: boolean;
  onShowPriceChart?: (assetName?: string, shouldToggle?: boolean) => void;
  showPriceChart?: boolean;
}

const RuneDetails: React.FC<RuneDetailsProps> = ({
  selectedRune,
  detailedRuneInfo,
  detailedRuneInfoError,
  isDetailedRuneInfoLoading,
  runeMarketInfo,
  isRuneMarketInfoLoading,
  runeMarketInfoError,
  showLoading,
  onShowPriceChart,
  showPriceChart = false,
}) => (
  <div
    className={`${styles.runeDetailsContainer} ${showPriceChart ? styles.narrowRightPanel : ""}`}
  >
    {(isDetailedRuneInfoLoading || showLoading) && selectedRune && (
      <p>Loading details for {selectedRune.formatted_name}...</p>
    )}
    {detailedRuneInfoError && selectedRune && !showLoading && (
      <p className={styles.errorText}>
        Error loading details: {detailedRuneInfoError.message}
      </p>
    )}
    {!isDetailedRuneInfoLoading && !showLoading && detailedRuneInfo && (
      <div>
        <h3>
          {detailedRuneInfo.formatted_name} ({detailedRuneInfo.symbol})
        </h3>
        <p>
          <strong>ID:</strong> {detailedRuneInfo.id}
        </p>
        <p>
          <strong>Number:</strong> {detailedRuneInfo.number}
        </p>
        <p>
          <strong>Decimals:</strong> {detailedRuneInfo.decimals}
        </p>
        <p>
          <strong>Etching Tx:</strong>{" "}
          {detailedRuneInfo.etching_txid ? (
            <a
              href={`https://ordiscan.com/tx/${detailedRuneInfo.etching_txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.etchingTxLink}
            >
              {truncateTxid(detailedRuneInfo.etching_txid)}
            </a>
          ) : (
            "N/A"
          )}
        </p>
        {runeMarketInfo && (
          <>
            <p>
              <strong>Price:</strong>{" "}
              <span className={styles.priceHighlight}>
                {runeMarketInfo.price_in_usd.toFixed(6)} USD
              </span>{" "}
              ({runeMarketInfo.price_in_sats.toFixed(2)} sats)
            </p>
            <p>
              <strong>Market Cap:</strong>{" "}
              {runeMarketInfo.market_cap_in_usd.toLocaleString()} USD
            </p>
          </>
        )}
        {isRuneMarketInfoLoading && (
          <p>
            <strong>Price:</strong>{" "}
            <span className={styles.loadingText}>Loading market data...</span>
          </p>
        )}
        {runeMarketInfoError && (
          <p>
            <strong>Price:</strong>{" "}
            <span className={styles.errorText}>
              Market data unavailable: {runeMarketInfoError.message}
            </span>
          </p>
        )}
        <p>
          <strong>Premined Supply:</strong>{" "}
          <FormattedRuneAmount
            runeName={detailedRuneInfo.name}
            rawAmount={detailedRuneInfo.premined_supply}
          />
        </p>
        <p>
          <strong>Total Supply:</strong>{" "}
          {detailedRuneInfo.current_supply !== undefined ? (
            <FormattedRuneAmount
              runeName={detailedRuneInfo.name}
              rawAmount={detailedRuneInfo.current_supply}
            />
          ) : (
            "N/A"
          )}
        </p>
        {detailedRuneInfo.amount_per_mint !== null &&
          detailedRuneInfo.amount_per_mint !== undefined && (
            <p>
              <strong>Amount/Mint:</strong>{" "}
              <FormattedRuneAmount
                runeName={detailedRuneInfo.name}
                rawAmount={detailedRuneInfo.amount_per_mint}
              />
            </p>
          )}
        {detailedRuneInfo.mint_count_cap && (
          <p>
            <strong>Mint Cap:</strong>{" "}
            {formatNumberString(detailedRuneInfo.mint_count_cap)}
          </p>
        )}
        {detailedRuneInfo.mint_start_block !== null && (
          <p>
            <strong>Mint Start Block:</strong>{" "}
            {detailedRuneInfo.mint_start_block}
          </p>
        )}
        {detailedRuneInfo.mint_end_block !== null && (
          <p>
            <strong>Mint End Block:</strong> {detailedRuneInfo.mint_end_block}
          </p>
        )}
        {detailedRuneInfo.current_mint_count !== undefined && (
          <p>
            <strong>Current Mint Count:</strong>{" "}
            {detailedRuneInfo.current_mint_count?.toLocaleString() || "N/A"}
          </p>
        )}
        {onShowPriceChart && (
          <div className={styles.showPriceChartButtonContainer}>
            <button
              className={styles.showPriceChartButton}
              onClick={() => onShowPriceChart(detailedRuneInfo.name, true)}
            >
              {showPriceChart ? "Hide Price Chart" : "Show Price Chart"}
            </button>
          </div>
        )}
      </div>
    )}
    {!selectedRune && !isDetailedRuneInfoLoading && !showLoading && (
      <p className={styles.hintText}>
        Select a rune from the list or search by name.
      </p>
    )}
  </div>
);

export default RuneDetails;
