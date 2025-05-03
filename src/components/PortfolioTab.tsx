import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSharedLaserEyes } from '@/context/LaserEyesContext';
import {
  fetchPortfolioDataFromApi,
  QUERY_KEYS,
  repayLiquidiumLoan,
  submitRepayPsbt,
  RepayLiquidiumLoanResponse
} from '@/lib/apiClient';
import { FormattedRuneAmount } from './FormattedRuneAmount';
import { FormattedLiquidiumCollateral } from './FormattedLiquidiumCollateral';
import { LoanStateEnum, LiquidiumLoanOffer } from '@/types/liquidium';
import styles from './PortfolioTab.module.css';
import Button from './Button';

type SortField = 'name' | 'balance' | 'value';
type SortDirection = 'asc' | 'desc';

export default function PortfolioTab() {
  const router = useRouter();
  const { address, paymentAddress, signMessage, signPsbt } = useSharedLaserEyes();
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [progress, setProgress] = useState(0); // 0 to 1
  const [stepText, setStepText] = useState('');
  const [liquidiumAuthenticated, setLiquidiumAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [liquidiumLoans, setLiquidiumLoans] = useState<LiquidiumLoanOffer[]>([]);
  const [isLoadingLiquidium, setIsLoadingLiquidium] = useState(false);
  const [liquidiumError, setLiquidiumError] = useState<string | null>(null);
  const [isRepayingLoanId, setIsRepayingLoanId] = useState<string | null>(null);

  // Add modal state
  const [repayModal, setRepayModal] = useState<{
    open: boolean;
    loan: LiquidiumLoanOffer | null;
    repayInfo: RepayLiquidiumLoanResponse['data'] | null;
    loading: boolean;
    error: string | null;
  }>({ open: false, loan: null, repayInfo: null, loading: false, error: null });

  // Use the new batch API endpoint for runes portfolio
  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_DATA, address],
    queryFn: () => fetchPortfolioDataFromApi(address || ''),
    enabled: !!address,
    staleTime: 30000, // Cache for 30 seconds
  });

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

  // Liquidium connect/auth handler
  const handleLiquidiumAuth = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      if (!address || !paymentAddress) {
        setAuthError('Wallet connection required for authentication');
        
        setIsAuthenticating(false);
        return;
      }
      if (!signMessage) {
        setAuthError('Your wallet does not support message signing');
        
        setIsAuthenticating(false);
        return;
      }
      // Step 1: Get challenge from backend
      
      const challengeRes = await fetch(`/api/liquidium/challenge?ordinalsAddress=${encodeURIComponent(address)}&paymentAddress=${encodeURIComponent(paymentAddress)}`);
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        setAuthError(challengeData?.error || 'Failed to get challenge');
        
        setIsAuthenticating(false);
        return;
      }
      const { ordinals, payment } = challengeData.data;
      // Step 2: Sign messages
      
      const ordinalsSignature = await signMessage(ordinals.message, address);
      let paymentSignature: string | undefined;
      if (payment) {
        paymentSignature = await signMessage(payment.message, paymentAddress);
      }
      // Step 3: Submit signatures to backend
      
      const authRes = await fetch('/api/liquidium/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordinalsAddress: address,
          paymentAddress,
          ordinalsSignature,
          paymentSignature,
          ordinalsNonce: ordinals.nonce,
          paymentNonce: payment?.nonce,
        }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setAuthError(authData?.error || 'Authentication failed');
        
        setIsAuthenticating(false);
        return;
      }
      setLiquidiumAuthenticated(true);
      
      // Fetch loans after auth
      fetchLiquidiumLoans();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message || 'Unknown error');
        
      } else {
        setAuthError('Unknown error');
        
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Fetch Liquidium loans from backend
  const fetchLiquidiumLoans = async () => {
    setIsLoadingLiquidium(true);
    setLiquidiumError(null);
    try {
      const res = await fetch(`/api/liquidium/portfolio?address=${encodeURIComponent(address || '')}`);
      const data = await res.json();
      if (!res.ok) {
        setLiquidiumError(data?.error || 'Failed to fetch loans');
        setLiquidiumLoans([]);
        
        return;
      }
      setLiquidiumLoans(data.data || []);
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLiquidiumError(err.message || 'Unknown error');
        setLiquidiumLoans([]);
      } else {
        setLiquidiumError('Unknown error');
        setLiquidiumLoans([]);
      }
    } finally {
      setIsLoadingLiquidium(false);
    }
  };

  // On mount or when address changes, check if already authenticated
  useEffect(() => {
    if (!address) return;
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      try {
        const res = await fetch(`/api/liquidium/portfolio?address=${encodeURIComponent(address)}`);
        if (res.status === 200) {
          setLiquidiumAuthenticated(true);
          const data = await res.json();
          setLiquidiumLoans(data.data || []);
          
        } else if (res.status === 401) {
          setLiquidiumAuthenticated(false);
          setLiquidiumLoans([]);
          
        } else {
          setLiquidiumAuthenticated(false);
          setLiquidiumLoans([]);
          
        }
      } catch {
        setLiquidiumAuthenticated(false);
        setLiquidiumLoans([]);
        
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [address]);

  // Minimal repay handler
  const handleRepay = async (loan: LiquidiumLoanOffer) => {
    setIsRepayingLoanId(loan.id);
    try {
      if (!address) throw new Error('Wallet address required');
      const result = await repayLiquidiumLoan(loan.id, address);
      if (result.success && result.data) {
        setRepayModal({ open: true, loan, repayInfo: result.data, loading: false, error: null });
      } else {
        setLiquidiumError(result.error || 'Failed to prepare repayment');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLiquidiumError(err.message || 'Failed to repay loan');
      } else {
        setLiquidiumError('Failed to repay loan');
        
      }
    } finally {
      setIsRepayingLoanId(null);
    }
  };

  const handleRepayModalClose = () => {
    setRepayModal({ open: false, loan: null, repayInfo: null, loading: false, error: null });
  };

  const handleRepayModalConfirm = async () => {
    if (!repayModal.loan || !repayModal.repayInfo || !repayModal.repayInfo.psbt) return;
    if (!address || !signPsbt) return;
    setRepayModal((m) => ({ ...m, loading: true, error: null }));
    try {
      // Log PSBT and repay info
      // Convert base64 PSBT to hex if needed
      const psbtBase64 = repayModal.repayInfo.psbt;
      // If signPsbt expects hex, convert
      // LaserEyesContext signPsbt accepts base64, but log both for debugging
      const psbtHex = Buffer.from(psbtBase64, 'base64').toString('hex');
      // Try both formats if unsure
      let signResult = await signPsbt(psbtBase64, false, false);
      if (!signResult?.signedPsbtBase64 && psbtHex) {
        signResult = await signPsbt(psbtHex, false, false);
      }
      const signedPsbt = signResult?.signedPsbtBase64 || signResult?.signedPsbtHex;
      if (!signedPsbt) throw new Error('Wallet did not return a signed PSBT');
      const submitResult = await submitRepayPsbt(repayModal.loan.id, signedPsbt, address);
      if (submitResult.success && submitResult.data) {
        setRepayModal({ ...repayModal, loading: false, error: null });
        alert(`Repayment submitted! TxID: ${submitResult.data.repayment_transaction_id}`);
        handleRepayModalClose();
        fetchLiquidiumLoans(); // Refresh loans
      } else {
        setRepayModal((m) => ({ ...m, loading: false, error: submitResult.error || 'Failed to submit repayment' }));
      }
    } catch (err: unknown) {
      setRepayModal((m) => ({ ...m, loading: false, error: err instanceof Error ? err.message : 'Failed to sign or submit repayment' }));
    }
  };

  // Log repayModal state when opening modal
  useEffect(() => {
    if (repayModal.open) {
      
    }
  }, [repayModal, repayModal.open]);

  if (!address) {
    return (
      <div className={styles.container}>
        <div>
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
          <div>{stepText}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className="errorText">Error loading portfolio</div>
      </div>
    );
  }

  if (!portfolioData?.balances?.length) {
    return (
      <div className={styles.container}>
        <div>No runes found in your wallet</div>
      </div>
    );
  }

  // Calculate values and sort the balances
  const sortedBalances = [...portfolioData.balances].map(rune => {
    const marketInfo = portfolioData.marketData?.[rune.name];
    const runeInfo = portfolioData.runeInfos?.[rune.name];
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

  // Helper function to format loan status
  const getLoanStatusClass = (status: LoanStateEnum): string => {
    switch (status) {
      case 'ACTIVE':
        return styles.statusActive;
      case 'ACTIVATING':
        return styles.statusActivating;
      case 'REPAYING':
        return styles.statusRepaying;
      case 'DEFAULTED':
        return styles.statusDefaulted;
      case 'LIQUIDATED':
        return styles.statusLiquidated;
      case 'REPAID':
        return styles.statusRepaid;
      default:
        return '';
    }
  };

  // Helper function to format date and time on separate lines
  const formatDate = (dateString: string): React.ReactNode => {
    const date = new Date(dateString);
    return (
      <div className={styles.dateTimeContainer}>
        <div className={styles.dateDisplay}>{date.toLocaleDateString()}</div>
        <div className={styles.timeDisplay}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    );
  };

  // Helper function to format sats to BTC
  const formatSatsToBtc = (sats: number): string => {
    return (sats / 1e8).toFixed(8);
  };

  return (
    <div className={styles.container}>
      {/* Runes Portfolio Section */}
      <div className={styles.listContainer}>
        <div className={`${styles.listHeader} ${styles.grid4col}`}>
          <div
            className="sortable"
            style={{ fontWeight: 'bold' }}
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
            className="sortable"
            style={{ fontWeight: 'bold' }}
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
            className="sortable"
            style={{ fontWeight: 'bold' }}
            onClick={() => handleSort('value')}
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
          {sortedBalances.map((rune) => {
            const marketInfo = portfolioData.marketData?.[rune.name];
            const usdValue = marketInfo?.price_in_usd
              ? rune.usdValue.toFixed(2)
              : '0.00';

            return (
              <div key={rune.name} className={`${styles.listItem} ${styles.grid4col}`}>
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
                          if (target) {
                            target.style.display = 'none';
                          }
                        }}
                      />
                    )}
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
                  {!portfolioData ? '...' : `$${usdValue}`}
                </div>
                <Button onClick={() => handleSwap(rune.name)}>
                  Swap
                </Button>
              </div>
            );
          })}
        </div>
        <div className={`${styles.portfolioTotals} ${styles.grid4col}`}>
          <div>Portfolio Total:</div>
          <div>≈ {totalBtcValue.toFixed(8)} BTC</div>
          <div>${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div></div>
        </div>
      </div>

      {/* Liquidium Loans Section */}
      <div className={styles.sectionDivider}>
        <div className={styles.dividerLine + ' ' + styles.top}></div>
        <div className={styles.dividerLine + ' ' + styles.bottom}></div>
        <div className="heading" style={{ marginTop: '1rem' }}>
          Liquidium Loans
        </div>
      </div>

      <div className={styles.liquidiumContainer}>
        <div className={`${styles.liquidiumHeader} ${styles.grid6col}`}>
          <div style={{ fontWeight: 'bold' }}>Collateral</div>
          <div style={{ fontWeight: 'bold' }}>Principal</div>
          <div style={{ fontWeight: 'bold' }}>Status</div>
          <div style={{ fontWeight: 'bold' }}>Due Date</div>
          <div style={{ fontWeight: 'bold' }}>Repayment</div>
          <div style={{ fontWeight: 'bold' }}>Action</div>
        </div>
        <div className={styles.listContent}>
          {isCheckingAuth ? (
            <div>Checking Liquidium connection...</div>
          ) : !liquidiumAuthenticated ? (
            <div className={styles.liquidiumAuth}>
              <Button
                onClick={handleLiquidiumAuth}
                disabled={isAuthenticating || !address || !signMessage}
              >
                {isAuthenticating ? 'Authenticating...' : 'Connect to Liquidium'}
              </Button>
              {authError && <div className="errorText">{typeof authError === 'string' ? authError : JSON.stringify(authError)}</div>}
            </div>
          ) : isLoadingLiquidium ? (
            <div>Loading Liquidium loans...</div>
          ) : liquidiumError ? (
            <div className="errorText">{typeof liquidiumError === 'string' ? liquidiumError : JSON.stringify(liquidiumError)}</div>
          ) : !liquidiumLoans.length ? (
            <div>No Liquidium loans found</div>
          ) : (
            liquidiumLoans.map((loan: LiquidiumLoanOffer) => (
              <div key={loan.id} className={`${styles.liquidiumItem} ${styles.grid6col}`}>
                <div>
                  <FormattedLiquidiumCollateral
                    runeId={loan.collateral_details.rune_id}
                    runeAmount={loan.collateral_details.rune_amount}
                    runeDivisibility={loan.collateral_details.rune_divisibility}
                  />
                </div>
                <div className={styles.btcValueContainer}>
                  <div className={styles.btcAmount}>{formatSatsToBtc(loan.loan_details.principal_amount_sats)}</div>
                  <div className={styles.btcLabel}>BTC</div>
                </div>
                <div className={styles.statusContainer}>
                  <span className={`${styles.loanStatus} ${getLoanStatusClass(loan.loan_details.state)}`}>
                    {loan.loan_details.state}
                  </span>
                </div>
                <div>
                  {formatDate(loan.loan_details.loan_term_end_date)}
                </div>
                <div className={styles.btcValueContainer}>
                  <div className={styles.btcAmount}>
                    {loan.loan_details.total_repayment_sats
                      ? formatSatsToBtc(loan.loan_details.total_repayment_sats)
                      : formatSatsToBtc(loan.loan_details.principal_amount_sats * (1 + loan.loan_details.discount.discount_rate))}
                  </div>
                  <div className={styles.btcLabel}>BTC</div>
                </div>
                <div>
                  {(loan.loan_details.state === 'ACTIVE') && (
                    // Temporarily disable repay button due to lasereyes issue
                    <Button
                      onClick={() => handleRepay(loan)}
                      disabled={true}
                      className={styles.repayButtonDisabled}
                      //disabled={isRepayingLoanId === loan.id}
                    >
                      {isRepayingLoanId === loan.id ? 'Repaying...' : 'Repay'}
                    </Button>
                  )}
                  {loan.loan_details.state === 'ACTIVATING' && (
                    <Button disabled={true}>
                      Activating...
                    </Button>
                  )}
                  {loan.loan_details.state === 'REPAYING' && (
                    <Button disabled={true}>
                      Processing...
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Repayment Confirmation Modal */}
      {repayModal.open && (
        <div className={styles.repayModalOverlay}>
          <div className={styles.repayModalWindow}>
            <h3 className="heading">Confirm Repayment</h3>
            <div>
              Repayment Amount: <b>{
                repayModal.loan
                  ? `${formatSatsToBtc(
                      repayModal.loan.loan_details.total_repayment_sats ??
                      repayModal.loan.loan_details.principal_amount_sats * (1 + repayModal.loan.loan_details.discount.discount_rate)
                    )} BTC`
                  : '...'}
              </b>
            </div>
            <div className="smallText" style={{ margin: '8px 0', wordBreak: 'break-all' }}>
              PSBT: <code>{repayModal.repayInfo?.psbt?.slice(0, 32)}...</code>
            </div>
            {repayModal.error && <div className="errorText" style={{ margin: '8px 0' }}>{repayModal.error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button onClick={handleRepayModalClose} disabled={repayModal.loading}>Cancel</Button>
              <Button onClick={handleRepayModalConfirm} disabled={repayModal.loading}>{repayModal.loading ? 'Processing...' : 'Sign & Repay'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}