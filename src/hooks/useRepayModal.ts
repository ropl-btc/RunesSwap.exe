import { useState } from "react";
import {
  repayLiquidiumLoan,
  submitRepayPsbt,
  RepayLiquidiumLoanResponse,
} from "@/lib/api";
import { LiquidiumLoanOffer } from "@/types/liquidium";

interface Args {
  address: string | null;
  signPsbt?: (
    tx: string,
    finalize?: boolean,
    broadcast?: boolean,
  ) => Promise<
    { signedPsbtHex?: string; signedPsbtBase64?: string } | undefined
  >;
}

export function useRepayModal({ address, signPsbt }: Args) {
  const [isRepayingLoanId, setIsRepayingLoanId] = useState<string | null>(null);
  const [repayModal, setRepayModal] = useState<{
    open: boolean;
    loan: LiquidiumLoanOffer | null;
    repayInfo: RepayLiquidiumLoanResponse["data"] | null;
    loading: boolean;
    error: string | null;
  }>({ open: false, loan: null, repayInfo: null, loading: false, error: null });

  const handleRepay = async (loan: LiquidiumLoanOffer) => {
    setIsRepayingLoanId(loan.id);
    try {
      if (!address) throw new Error("Wallet address required");
      const result = await repayLiquidiumLoan(loan.id, address);
      if (result.success && result.data) {
        setRepayModal({
          open: true,
          loan,
          repayInfo: result.data,
          loading: false,
          error: null,
        });
      } else {
        throw new Error(result.error || "Failed to prepare repayment");
      }
    } catch (err) {
      setRepayModal({
        open: true,
        loan,
        repayInfo: null,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsRepayingLoanId(null);
    }
  };

  const handleRepayModalClose = () => {
    setRepayModal({
      open: false,
      loan: null,
      repayInfo: null,
      loading: false,
      error: null,
    });
  };

  const handleRepayModalConfirm = async () => {
    if (!repayModal.loan || !repayModal.repayInfo || !repayModal.repayInfo.psbt)
      return;
    if (!address || !signPsbt) return;
    setRepayModal((m) => ({ ...m, loading: true, error: null }));
    try {
      const psbtBase64 = repayModal.repayInfo.psbt;
      const signResult = await signPsbt(psbtBase64, false, false);
      const signedPsbt =
        signResult?.signedPsbtBase64 || signResult?.signedPsbtHex;
      if (!signedPsbt) throw new Error("Wallet did not return a signed PSBT");
      const submitResult = await submitRepayPsbt(
        repayModal.loan.id,
        signedPsbt,
        address,
      );
      if (submitResult.success && submitResult.data) {
        setRepayModal({ ...repayModal, loading: false, error: null });
        handleRepayModalClose();
      } else {
        setRepayModal((m) => ({
          ...m,
          loading: false,
          error: submitResult.error || "Failed to submit repayment",
        }));
      }
    } catch (err) {
      setRepayModal((m) => ({
        ...m,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  return {
    isRepayingLoanId,
    repayModal,
    handleRepay,
    handleRepayModalClose,
    handleRepayModalConfirm,
  };
}
