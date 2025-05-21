import { useRouter } from "next/navigation";
import { useSharedLaserEyes } from "@/context/LaserEyesContext";
import styles from "./PortfolioTab.module.css";
import RunesPortfolioTable from "./RunesPortfolioTable";
import LiquidiumLoansSection from "./LiquidiumLoansSection";
import RepayModal from "./RepayModal";
import usePortfolioData from "@/hooks/usePortfolioData";
import useLiquidiumAuth from "@/hooks/useLiquidiumAuth";
import { useRepayModal } from "@/hooks/useRepayModal";

export default function PortfolioTab() {
  const router = useRouter();
  const { address, paymentAddress, signMessage, signPsbt } =
    useSharedLaserEyes();

  const {
    sortedBalances,
    totalBtcValue,
    totalUsdValue,
    sortField,
    sortDirection,
    handleSort,
    progress,
    stepText,
    isLoading,
    error,
  } = usePortfolioData(address);

  const {
    liquidiumAuthenticated,
    isAuthenticating,
    isCheckingAuth,
    authError,
    liquidiumLoans,
    isLoadingLiquidium,
    liquidiumError,
    handleLiquidiumAuth,
  } = useLiquidiumAuth({ address, paymentAddress, signMessage });

  const {
    isRepayingLoanId,
    repayModal,
    handleRepay,
    handleRepayModalClose,
    handleRepayModalConfirm,
  } = useRepayModal({ address, signPsbt });

  const handleSwap = (runeName: string) => {
    router.push(`/?tab=swap&rune=${encodeURIComponent(runeName)}`, {
      scroll: false,
    });
    window.dispatchEvent(
      new CustomEvent("tabChange", { detail: { tab: "swap", rune: runeName } }),
    );
  };

  const formatSatsToBtc = (sats: number): string => (sats / 1e8).toFixed(8);

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

  if (!sortedBalances.length) {
    return (
      <div className={styles.container}>
        <div>No runes found in your wallet</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <RunesPortfolioTable
        balances={sortedBalances}
        totalBtcValue={totalBtcValue}
        totalUsdValue={totalUsdValue}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onSwap={handleSwap}
      />

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
