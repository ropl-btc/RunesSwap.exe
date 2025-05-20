import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSharedLaserEyes } from "@/context/LaserEyesContext";
import { fetchPortfolioDataFromApi, QUERY_KEYS } from "@/lib/apiClient";
import { LiquidiumLoanOffer } from "@/types/liquidium";
import styles from "./PortfolioTab.module.css";
import RunesPortfolioTable from "./RunesPortfolioTable";
import LiquidiumLoansSection from "./LiquidiumLoansSection";
import RepayModal from "./RepayModal";
import { useLiquidiumPortfolio } from "@/hooks/useLiquidiumPortfolio";

type SortField = "name" | "balance" | "value";
type SortDirection = "asc" | "desc";

export default function PortfolioTab() {
  const router = useRouter();
  const { address, paymentAddress, signMessage, signPsbt } =
    useSharedLaserEyes();
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [progress, setProgress] = useState(0); // 0 to 1
  const [stepText, setStepText] = useState("");
  const [liquidiumAuthenticated, setLiquidiumAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [liquidiumLoans, setLiquidiumLoans] = useState<LiquidiumLoanOffer[]>(
    [],
  );
  const [isLoadingLiquidium, setIsLoadingLiquidium] = useState(false);
  const [liquidiumError, setLiquidiumError] = useState<string | null>(null);

  const {
    isRepayingLoanId,
    repayModal,
    handleRepay,
    handleRepayModalClose,
    handleRepayModalConfirm,
  } = useLiquidiumPortfolio({ address, signPsbt });

  // Use the new batch API endpoint for runes portfolio
  const {
    data: portfolioData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_DATA, address],
    queryFn: () => fetchPortfolioDataFromApi(address || ""),
    enabled: !!address,
    staleTime: 30000, // Cache for 30 seconds
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleSwap = (runeName: string) => {
    // Update URL without page refresh
    router.push(`/?tab=swap&rune=${encodeURIComponent(runeName)}`, {
      scroll: false,
    });
    // Emit custom event to notify parent components
    window.dispatchEvent(
      new CustomEvent("tabChange", { detail: { tab: "swap", rune: runeName } }),
    );
  };

  // Simulate progress bar during loading
  useEffect(() => {
    if (!isLoading) return;
    let isMounted = true;
    let step = 0;
    const totalSteps = 4; // 1: balances, 2: rune info, 3: market data, 4: finalizing
    const stepLabels = [
      "Fetching balances...",
      "Fetching rune info...",
      "Fetching market data...",
      "Finalizing...",
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
        setStepText("Finalizing...");
      }
    }
    setTimeout(nextStep, 400 + Math.random() * 400);
    return () => {
      isMounted = false;
    };
  }, [isLoading]);

  // Liquidium connect/auth handler
  const handleLiquidiumAuth = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      if (!address || !paymentAddress) {
        setAuthError("Wallet connection required for authentication");

        setIsAuthenticating(false);
        return;
      }
      if (!signMessage) {
        setAuthError("Your wallet does not support message signing");

        setIsAuthenticating(false);
        return;
      }
      // Step 1: Get challenge from backend

      const challengeRes = await fetch(
        `/api/liquidium/challenge?ordinalsAddress=${encodeURIComponent(address)}&paymentAddress=${encodeURIComponent(paymentAddress)}`,
      );
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        setAuthError(challengeData?.error || "Failed to get challenge");

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

      const authRes = await fetch("/api/liquidium/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setAuthError(authData?.error || "Authentication failed");

        setIsAuthenticating(false);
        return;
      }
      setLiquidiumAuthenticated(true);

      // Fetch loans after auth
      fetchLiquidiumLoans();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message || "Unknown error");
      } else {
        setAuthError("Unknown error");
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
      const res = await fetch(
        `/api/liquidium/portfolio?address=${encodeURIComponent(address || "")}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setLiquidiumError(data?.error || "Failed to fetch loans");
        setLiquidiumLoans([]);

        return;
      }
      setLiquidiumLoans(data.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLiquidiumError(err.message || "Unknown error");
        setLiquidiumLoans([]);
      } else {
        setLiquidiumError("Unknown error");
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
        const res = await fetch(
          `/api/liquidium/portfolio?address=${encodeURIComponent(address)}`,
        );
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

  // Log repayModal state when opening modal
  useEffect(() => {
    if (repayModal.open) {
    }
  }, [repayModal, repayModal.open]);

  if (!address) {
    return (
      <div className={styles.container}>
        <div>Connect your wallet to view your portfolio</div>
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
  const sortedBalances = [...portfolioData.balances]
    .map((rune) => {
      const marketInfo = portfolioData.marketData?.[rune.name];
      const runeInfo = portfolioData.runeInfos?.[rune.name];
      const decimals = runeInfo?.decimals || 0;
      const actualBalance = Number(rune.balance) / Math.pow(10, decimals);
      const btcValue = marketInfo?.price_in_sats
        ? (actualBalance * marketInfo.price_in_sats) / 1e8
        : 0;
      const usdValue = marketInfo?.price_in_usd
        ? actualBalance * marketInfo.price_in_usd
        : 0;
      const imageURI = `https://icon.unisat.io/icon/runes/${encodeURIComponent(rune.name)}`;

      return {
        ...rune,
        actualBalance,
        btcValue,
        usdValue,
        imageURI,
        formattedName: runeInfo?.formatted_name || rune.name,
      };
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "balance":
          comparison = a.actualBalance - b.actualBalance;
          break;
        case "value":
          comparison = a.usdValue - b.usdValue;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  // Calculate totals
  const totalBtcValue = sortedBalances.reduce(
    (sum, rune) => sum + rune.btcValue,
    0,
  );
  const totalUsdValue = sortedBalances.reduce(
    (sum, rune) => sum + rune.usdValue,
    0,
  );

  // Helper function to format loan status

  // Helper function to format sats to BTC
  const formatSatsToBtc = (sats: number): string => (sats / 1e8).toFixed(8);

  return (
    <div className={styles.container}>
      {/* Runes Portfolio Section */}
      <RunesPortfolioTable
        balances={sortedBalances}
        totalBtcValue={totalBtcValue}
        totalUsdValue={totalUsdValue}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onSwap={handleSwap}
      />

      {/* Liquidium Loans Section */}
      <div className={styles.sectionDivider}>
        <div className={styles.dividerLine + " " + styles.top}></div>
        <div className={styles.dividerLine + " " + styles.bottom}></div>
        <div className="heading" style={{ marginTop: "1rem" }}>
          Liquidium Loans
        </div>
      </div>

      <LiquidiumLoansSection
        loans={liquidiumLoans}
        isCheckingAuth={isCheckingAuth}
        liquidiumAuthenticated={liquidiumAuthenticated}
        isAuthenticating={isAuthenticating}
        authError={authError}
        isLoadingLiquidium={isLoadingLiquidium}
        liquidiumError={liquidiumError}
        isRepayingLoanId={isRepayingLoanId}
        onAuth={handleLiquidiumAuth}
        onRepay={handleRepay}
      />

      <RepayModal
        open={repayModal.open}
        repayAmount={
          repayModal.loan
            ? `${formatSatsToBtc(
                repayModal.loan.loan_details.total_repayment_sats ??
                  repayModal.loan.loan_details.principal_amount_sats *
                    (1 + repayModal.loan.loan_details.discount.discount_rate),
              )} BTC`
            : "..."
        }
        psbtPreview={repayModal.repayInfo?.psbt?.slice(0, 32) || ""}
        loading={repayModal.loading}
        error={repayModal.error}
        onCancel={handleRepayModalClose}
        onConfirm={handleRepayModalConfirm}
      />
    </div>
  );
}
