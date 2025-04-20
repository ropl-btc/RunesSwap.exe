import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSharedLaserEyes } from '@/context/LaserEyesContext';
import { fetchPortfolioDataFromApi } from '@/lib/apiClient';
import { QUERY_KEYS } from '@/lib/apiClient';
import { FormattedRuneAmount } from './FormattedRuneAmount';
import styles from './PortfolioTab.module.css';

type SortField = 'name' | 'balance' | 'value';
type SortDirection = 'asc' | 'desc';

export default function PortfolioTab() {
  const router = useRouter();
  const { address } = useSharedLaserEyes();
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [progress, setProgress] = useState(0); // 0 to 1
  const [stepText, setStepText] = useState('');

  // Use the new batch API endpoint
  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_DATA, address],
    queryFn: () => fetchPortfolioDataFromApi(address || ''),
    enabled: !!address,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Extract data from the combined response
  const runeBalances = portfolioData?.balances || [];
  const runeInfoData = portfolioData?.runeInfos || {};
  const marketData = portfolioData?.marketData || {};

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSwap = (runeName: string) => {
    // Update URL without page refresh
    router.push(`/?tab=swap&rune=${encodeURIComponent(runeName)}`, { scroll: false });
    // Emit custom event to notify parent components
    window.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: 'swap', rune: runeName } }));
  };

  // Simulate progress bar during loading
  useEffect(() => {
    if (!isLoading) return;
    let isMounted = true;
    let step = 0;
    const totalSteps = 4; // 1: balances, 2: rune info, 3: market data, 4: finalizing
    const stepLabels = [
      'Fetching balances...',
      'Fetching rune info...',
      'Fetching market data...',
      'Finalizing...'
    ];
    setProgress(0);
    setStepText(stepLabels[0]);
    function nextStep() {
      if (!isMounted) return;
      step++;
      if (step < totalSteps) {
        setProgress(step / totalSteps);
        setStepText(stepLabels[step]);
        setTimeout(nextStep, 400 + Math.random() * 400); // Simulate 400-800ms per step
      } else {
        setProgress(1);
        setStepText('Finalizing...');
      }
    }
    setTimeout(nextStep, 400 + Math.random() * 400);
    return () => { isMounted = false; };
  }, [isLoading]);

  if (!address) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          Connect your wallet to view your portfolio
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.progressContainer}>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className={styles.progressStepText}>{stepText}</div>
        </div>
        <div className={styles.message}>Loading your portfolio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>Error loading portfolio</div>
      </div>
    );
  }

  if (!runeBalances?.length) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>No runes found in your wallet</div>
      </div>
    );
  }

  // Calculate values and sort the balances
  const sortedBalances = [...runeBalances].map(rune => {
    const marketInfo = marketData?.[rune.name];
    const runeInfo = runeInfoData?.[rune.name];
    const decimals = runeInfo?.decimals || 0;
    const actualBalance = Number(rune.balance) / Math.pow(10, decimals);
    const btcValue = marketInfo?.price_in_sats ? (actualBalance * marketInfo.price_in_sats) / 1e8 : 0;
    const usdValue = marketInfo?.price_in_usd ? actualBalance * marketInfo.price_in_usd : 0;
    const imageURI = `https://icon.unisat.io/icon/runes/${encodeURIComponent(rune.name)}`;

    return {
      ...rune,
      actualBalance,
      btcValue,
      usdValue,
      imageURI,
      formattedName: runeInfo?.formatted_name || rune.name,
    };
  }).sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'balance':
        comparison = a.actualBalance - b.actualBalance;
        break;
      case 'value':
        comparison = a.usdValue - b.usdValue;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Calculate totals
  const totalBtcValue = sortedBalances.reduce((sum, rune) => sum + rune.btcValue, 0);
  const totalUsdValue = sortedBalances.reduce((sum, rune) => sum + rune.usdValue, 0);

  return (
    <div className={styles.container}>
      <div className={styles.listContainer}>
        <div className={styles.listHeader}>
          <div 
            className={`${styles.runeNameHeader} ${styles.sortable}`}
            onClick={() => handleSort('name')}
          >
            Rune Name
            {sortField === 'name' && (
              <span className={styles.sortArrow}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div 
            className={`${styles.runeBalanceHeader} ${styles.sortable}`}
            onClick={() => handleSort('balance')}
          >
            Balance
            {sortField === 'balance' && (
              <span className={styles.sortArrow}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div 
            className={`${styles.runeValueHeader} ${styles.sortable}`}
            onClick={() => handleSort('value')}
          >
            Value (USD)
            {sortField === 'value' && (
              <span className={styles.sortArrow}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div>Action</div>
        </div>
        <div className={styles.listContent}>
          {sortedBalances.map((rune) => {
            const marketInfo = marketData?.[rune.name];
            const usdValue = marketInfo?.price_in_usd 
              ? rune.usdValue.toFixed(2)
              : '0.00';

            return (
              <div key={rune.name} className={styles.listItem}>
                <div className={styles.runeName}>
                  <div className={styles.runeNameContent}>
                    <Image
                      src={rune.imageURI}
                      alt=""
                      className={styles.runeImage}
                      width={24}
                      height={24}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target) {
                          target.style.display = 'none';
                        }
                      }}
                    />
                    <div className={styles.runeNameText}>
                      <div className={styles.runeFullName}>{rune.formattedName}</div>
                    </div>
                  </div>
                </div>
                <div className={styles.runeBalance}>
                  <FormattedRuneAmount
                    runeName={rune.name}
                    rawAmount={rune.balance}
                  />
                </div>
                <div className={styles.runeValue}>
                  {!marketData ? '...' : `$${usdValue}`}
                </div>
                <button 
                  className={styles.swapButton}
                  onClick={() => handleSwap(rune.name)}
                >
                  Swap
                </button>
              </div>
            );
          })}
        </div>
        <div className={styles.portfolioTotals}>
          <div>Portfolio Total:</div>
          <div>≈ {totalBtcValue.toFixed(8)} BTC</div>
          <div>${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div></div>
        </div>
      </div>
    </div>
  );
} 