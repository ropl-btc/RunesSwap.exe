import Image from 'next/image';
import React from 'react';
import type { Asset } from '@/types/common';
import Button from './Button';
import { FormattedRuneAmount } from './FormattedRuneAmount';
import styles from './PortfolioTab.module.css';

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
  sortField: 'name' | 'balance' | 'value';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'name' | 'balance' | 'value') => void;
  onSwap: (asset: Asset) => void;
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
        style={{ fontWeight: 'bold' }}
        onClick={() => onSort('name')}
        role="columnheader"
        tabIndex={0}
        aria-sort={
          sortField === 'name'
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
        }
        onKeyDown={(e) => e.key === 'Enter' && onSort('name')}
      >
        Rune Name
        {sortField === 'name' && (
          <span className={styles.sortArrow}>
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div
        className="sortable"
        style={{ fontWeight: 'bold' }}
        onClick={() => onSort('balance')}
        role="columnheader"
        tabIndex={0}
        aria-sort={
          sortField === 'balance'
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
        }
        onKeyDown={(e) => e.key === 'Enter' && onSort('balance')}
      >
        Balance
        {sortField === 'balance' && (
          <span className={styles.sortArrow}>
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div
        className="sortable"
        style={{ fontWeight: 'bold' }}
        onClick={() => onSort('value')}
        role="columnheader"
        tabIndex={0}
        aria-sort={
          sortField === 'value'
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
        }
        onKeyDown={(e) => e.key === 'Enter' && onSort('value')}
      >
        Value (USD)
        {sortField === 'value' && (
          <span className={styles.sortArrow}>
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 'bold' }}>Action</div>
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
                    alt={`${rune.formattedName} icon`}
                    className={styles.runeImage}
                    width={24}
                    height={24}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target) target.style.display = 'none';
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
            <Button
              onClick={() =>
                onSwap({
                  id: rune.name.toLowerCase(),
                  name: rune.formattedName,
                  imageURI: rune.imageURI ?? '',
                  isBTC: false,
                })
              }
            >
              Swap
            </Button>
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
