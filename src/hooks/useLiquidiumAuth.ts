import { useState, useEffect } from "react";
import { LiquidiumLoanOffer } from "@/types/liquidium";

interface UseLiquidiumAuthArgs {
  address: string | null;
  paymentAddress: string | null;
  signMessage?: (message: string, address: string) => Promise<string>;
}

export function useLiquidiumAuth({
  address,
  paymentAddress,
  signMessage,
}: UseLiquidiumAuthArgs) {
  const [liquidiumAuthenticated, setLiquidiumAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [liquidiumLoans, setLiquidiumLoans] = useState<LiquidiumLoanOffer[]>(
    [],
  );
  const [isLoadingLiquidium, setIsLoadingLiquidium] = useState(false);
  const [liquidiumError, setLiquidiumError] = useState<string | null>(null);

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
      setLiquidiumError(err instanceof Error ? err.message : "Unknown error");
      setLiquidiumLoans([]);
    } finally {
      setIsLoadingLiquidium(false);
    }
  };

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

      const challengeRes = await fetch(
        `/api/liquidium/challenge?ordinalsAddress=${encodeURIComponent(
          address,
        )}&paymentAddress=${encodeURIComponent(paymentAddress)}`,
      );
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        setAuthError(challengeData?.error || "Failed to get challenge");
        setIsAuthenticating(false);
        return;
      }
      const { ordinals, payment } = challengeData.data;
      const ordinalsSignature = await signMessage(ordinals.message, address);
      let paymentSignature: string | undefined;
      if (payment) {
        paymentSignature = await signMessage(payment.message, paymentAddress);
      }
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
      fetchLiquidiumLoans();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsAuthenticating(false);
    }
  };

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

  return {
    liquidiumAuthenticated,
    isAuthenticating,
    isCheckingAuth,
    authError,
    liquidiumLoans,
    isLoadingLiquidium,
    liquidiumError,
    handleLiquidiumAuth,
    fetchLiquidiumLoans,
  };
}

export default useLiquidiumAuth;
