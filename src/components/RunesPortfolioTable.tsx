import React from "react";
import Image from "next/image";
import { FormattedRuneAmount } from "./FormattedRuneAmount";
import Button from "./Button";
import styles from "./PortfolioTab.module.css";

interface RuneBalanceItem {
  name: string;
  formattedName: string;
  balance: string;
  imageURI?: string;
  usdValue: number;
  actualBalance: number;
  btcValue: number;
}

interface RunesPortfolioTableProps {
  balances: RuneBalanceItem[];
  totalBtcValue: number;
  totalUsdValue: number;
  sortField: "name" | "balance" | "value";
  sortDirection: "asc" | "desc";
  onSort: (field: "name" | "balance" | "value") => void;
  onSwap: (name: string) => void;
}

const RunesPortfolioTable: React.FC<RunesPortfolioTableProps> = ({
  balances,
  totalBtcValue,
  totalUsdValue,
  sortField,
  sortDirection,
  onSort,
  onSwap,
}) => (
  <div className={styles.listContainer}>
    <div className={`${styles.listHeader} ${styles.grid4col}`}>
      <div
        className="sortable"
        style={{ fontWeight: "bold" }}
        onClick={() => onSort("name")}
      >
        Rune Name
        {sortField === "name" && (
          <span className={styles.sortArrow}>
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
      <div
        className="sortable"
        style={{ fontWeight: "bold" }}
        onClick={() => onSort("balance")}
      >
        Balance
        {sortField === "balance" && (
          <span className={styles.sortArrow}>
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
      <div
        className="sortable"
        style={{ fontWeight: "bold" }}
        onClick={() => onSort("value")}
      >
        Value (USD)
        {sortField === "value" && (
          <span className={styles.sortArrow}>
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
      <div style={{ fontWeight: "bold" }}>Action</div>
    </div>
    <div className={styles.listContent}>
      {balances.map((rune) => {
        const usdValue = rune.usdValue.toFixed(2);
        return (
          <div
            key={rune.name}
            className={`${styles.listItem} ${styles.grid4col}`}
          >
            <div className={styles.runeName}>
              <div className={styles.runeNameContent}>
                {rune.imageURI && (
                  <Image
                    src={rune.imageURI}
                    alt=""
                    className={styles.runeImage}
                    width={24}
                    height={24}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target) target.style.display = "none";
                    }}
                  />
                )}
                <div className={styles.runeNameText}>
                  <div className={styles.runeFullName}>
                    {rune.formattedName}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.runeBalance}>
              <FormattedRuneAmount
                runeName={rune.name}
                rawAmount={rune.balance}
              />
            </div>
            <div className={styles.runeValue}>${usdValue}</div>
            <Button onClick={() => onSwap(rune.name)}>Swap</Button>
          </div>
        );
      })}
    </div>
    <div className={`${styles.portfolioTotals} ${styles.grid4col}`}>
      <div>Portfolio Total:</div>
      <div>≈ {totalBtcValue.toFixed(8)} BTC</div>
      <div>
        $
        {totalUsdValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      <div></div>
    </div>
  </div>
);

export default RunesPortfolioTable;
