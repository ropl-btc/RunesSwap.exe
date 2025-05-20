"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import styles from "./BorrowTab.module.css";
import Button from "./Button"; // Reuse Button component
import { Asset } from "@/types/common";
import { FormattedRuneAmount } from "./FormattedRuneAmount"; // Reuse FormattedRuneAmount
import { InputArea } from "./InputArea";
import {
  fetchPopularFromApi,
  fetchRuneBalancesFromApi,
  fetchRuneInfoFromApi,
  fetchRuneMarketFromApi,
  fetchBorrowQuotesFromApi,
  fetchBorrowRangesFromApi,
  prepareLiquidiumBorrow,
  submitLiquidiumBorrow,
  QUERY_KEYS,
  LiquidiumBorrowQuoteResponse,
  LiquidiumBorrowQuoteOffer,
  LiquidiumPrepareBorrowResponse,
  LiquidiumSubmitBorrowResponse,
} from "@/lib/apiClient";
import {
  type RuneBalance as OrdiscanRuneBalance,
  type RuneMarketInfo as OrdiscanRuneMarketInfo,
} from "@/types/ordiscan";
import { type RuneData } from "@/lib/runesData";

interface BorrowTabProps {
  connected: boolean;
  address: string | null;
  paymentAddress: string | null;
  publicKey: string | null;
  paymentPublicKey: string | null;
  signPsbt: (
    tx: string,
    finalize?: boolean,
    broadcast?: boolean,
  ) => Promise<
    | { signedPsbtHex?: string; signedPsbtBase64?: string; txId?: string }
    | undefined
  >;
  btcPriceUsd: number | undefined;
  isBtcPriceLoading: boolean;
  btcPriceError: Error | null;
  cachedPopularRunes?: Record<string, unknown>[];
  isPopularRunesLoading?: boolean;
  popularRunesError?: Error | null;
}

export function BorrowTab({
  connected,
  address,
  paymentAddress,
  publicKey,
  paymentPublicKey,
  signPsbt,
}: BorrowTabProps) {
  // --- State ---
  const [collateralAsset, setCollateralAsset] = useState<Asset | null>(null);
  const [collateralAmount, setCollateralAmount] = useState(""); // Amount of Rune to use as collateral
  // State for rune fetching/searching
  const [isPopularLoading, setIsPopularLoading] = useState(false); // Local state for popular runes
  const [popularRunes, setPopularRunes] = useState<Asset[]>([]);
  const [popularError, setPopularError] = useState<string | null>(null);

  // State for quotes
  const [quotes, setQuotes] = useState<LiquidiumBorrowQuoteOffer[]>([]);
  const [isQuotesLoading, setIsQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [minMaxRange, setMinMaxRange] = useState<string | null>(null);
  const [borrowRangeError, setBorrowRangeError] = useState<string | null>(null);

  // State for loan process
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loanProcessError, setLoanProcessError] = useState<string | null>(null);
  const [loanTxId, setLoanTxId] = useState<string | null>(null);

  // --- Data Fetching ---
  // Fetch popular runes on mount using API
  useEffect(() => {
    const fetchPopular = async () => {
      setIsPopularLoading(true);
      setPopularError(null);
      setPopularRunes([]);
      try {
        // Define the hardcoded asset
        const liquidiumToken: Asset = {
          id: "liquidiumtoken",
          name: "LIQUIDIUM•TOKEN",
          imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
          isBTC: false,
        };
        const response = await fetchPopularFromApi();
        let mappedRunes: Asset[] = [];
        if (!Array.isArray(response)) {
          mappedRunes = [liquidiumToken];
        } else {
          const fetchedRunes: Asset[] = response
            .map((collection: Record<string, unknown>) => ({
              id: (collection?.rune_id as string) || `unknown_${Math.random()}`, // Use rune_id if available
              name: (
                (collection?.slug as string) ||
                (collection?.rune as string) ||
                "Unknown"
              ).replace(/-/g, "•"), // Use slug or rune name
              imageURI:
                (collection?.icon_content_url_data as string) ||
                (collection?.imageURI as string),
              isBTC: false,
            }))
            .filter(
              (rune) =>
                rune.id !== liquidiumToken.id &&
                rune.name.replace(/•/g, "") !==
                  liquidiumToken.name.replace(/•/g, ""),
            );
          mappedRunes = [liquidiumToken, ...fetchedRunes];
        }
        setPopularRunes(mappedRunes);
        // Set default collateral asset if none is selected
        if (!collateralAsset && mappedRunes.length > 0) {
          setCollateralAsset(mappedRunes[0]);
        }
      } catch (error) {
        setPopularError(
          error instanceof Error
            ? error.message
            : "Failed to fetch popular runes",
        );
        const liquidiumTokenOnError: Asset = {
          id: "liquidiumtoken",
          name: "LIQUIDIUM•TOKEN",
          imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
          isBTC: false,
        };
        setPopularRunes([liquidiumTokenOnError]);
        if (!collateralAsset) {
          setCollateralAsset(liquidiumTokenOnError);
        }
      } finally {
        setIsPopularLoading(false);
      }
    };
    fetchPopular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  // Query for Rune Balances
  const { data: runeBalances, isLoading: isRuneBalancesLoading } = useQuery<
    OrdiscanRuneBalance[],
    Error
  >({
    queryKey: [QUERY_KEYS.RUNE_BALANCES, address],
    queryFn: () => fetchRuneBalancesFromApi(address!),
    enabled: !!connected && !!address,
    staleTime: 30000,
  });

  // Query for Collateral Rune Info (for decimals)
  const { data: collateralRuneInfo, isLoading: isCollateralRuneInfoLoading } =
    useQuery<RuneData | null, Error>({
      queryKey: [QUERY_KEYS.RUNE_INFO, collateralAsset?.name],
      queryFn: () =>
        collateralAsset && !collateralAsset.isBTC
          ? fetchRuneInfoFromApi(collateralAsset.name)
          : Promise.resolve(null),
      enabled: !!collateralAsset && !collateralAsset.isBTC,
      staleTime: Infinity,
    });

  // Query for Collateral Rune Market Info (for USD value)
  const { data: collateralRuneMarketInfo } = useQuery<
    OrdiscanRuneMarketInfo | null,
    Error
  >({
    queryKey: [QUERY_KEYS.RUNE_MARKET, collateralAsset?.name],
    queryFn: () =>
      collateralAsset && !collateralAsset.isBTC
        ? fetchRuneMarketFromApi(collateralAsset.name)
        : Promise.resolve(null),
    enabled: !!collateralAsset && !collateralAsset.isBTC,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch min-max range when collateral asset changes
  useEffect(() => {
    const fetchMinMaxRange = async () => {
      if (!collateralAsset || !address || collateralAsset.isBTC) {
        setMinMaxRange(null);
        setBorrowRangeError(null);
        return;
      }

      try {
        // Get the actual rune ID from collateralRuneInfo if available
        let runeIdForApi = collateralAsset.id;

        if (collateralRuneInfo?.id?.includes(":")) {
          runeIdForApi = collateralRuneInfo.id;
        }

        const result = await fetchBorrowRangesFromApi(runeIdForApi, address);

        if (result.success && result.data) {
          const { minAmount, maxAmount } = result.data;

          // Convert raw values to formatted values based on decimals
          const decimals = collateralRuneInfo?.decimals ?? 0;
          const minFormatted = formatRuneAmount(minAmount, decimals);
          const maxFormatted = formatRuneAmount(maxAmount, decimals);

          setMinMaxRange(`Min: ${minFormatted} - Max: ${maxFormatted}`);
          setBorrowRangeError(null);
        } else {
          setMinMaxRange(null);
          setBorrowRangeError(null);
        }
      } catch (error) {
        console.error("[BorrowTab] Error fetching min-max range:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setMinMaxRange(null);
        // Detect "No valid ranges found" error
        if (
          errorMessage.includes("No valid ranges found") ||
          errorMessage.includes(
            "Could not find valid borrow ranges for this rune",
          )
        ) {
          setBorrowRangeError(
            "This rune is not currently available for borrowing on Liquidium.",
          );
        } else {
          setBorrowRangeError(null);
        }
      }
    };

    fetchMinMaxRange();
  }, [collateralAsset, address, collateralRuneInfo]);

  // --- Helper Functions ---
  // Helper function to format rune amounts with BigInt precision
  const formatRuneAmount = (rawAmount: string, decimals: number): string => {
    try {
      // Using BigInt to maintain precision
      const rawAmountBigInt = BigInt(rawAmount);
      const divisorBigInt = BigInt(10 ** decimals);

      // Scale by 100 for two decimal places of precision
      const scaledAmount = (rawAmountBigInt * BigInt(100)) / divisorBigInt;

      // Convert to number for formatting (safe now that we've scaled down)
      const scaledNumber = Number(scaledAmount) / 100;

      return scaledNumber.toFixed(decimals > 0 ? 2 : 0);
    } catch {
      // Fallback to basic number conversion if BigInt fails
      return (Number(rawAmount) / 10 ** decimals).toFixed(decimals > 0 ? 2 : 0);
    }
  };

  const getSpecificRuneBalance = (
    runeName: string | undefined,
  ): string | null => {
    if (!runeName || !runeBalances) return null;
    const formattedRuneName = runeName.replace(/•/g, "");
    const found = runeBalances.find((rb) => rb.name === formattedRuneName);
    return found ? found.balance : "0";
  };

  // --- Handlers ---
  const handleSelectCollateral = (asset: Asset) => {
    setCollateralAsset(asset);
    setCollateralAmount("");
    setQuotes([]);
    setQuotesError(null);
    setSelectedQuoteId(null);
    setLoanProcessError(null);
    setLoanTxId(null);
    setMinMaxRange(null);
  };

  const handleGetQuotes = async () => {
    if (!collateralAsset || !collateralAmount || !address) {
      return;
    }

    setIsQuotesLoading(true);
    setQuotesError(null);
    setQuotes([]);
    setSelectedQuoteId(null);
    setLoanProcessError(null);
    setLoanTxId(null);

    try {
      // Convert user amount to raw amount based on decimals
      const decimals = collateralRuneInfo?.decimals ?? 0;

      // Calculate raw amount with proper decimal handling
      let rawAmount;
      try {
        // Pure BigInt calculation to maintain precision
        const amountFloat = parseFloat(collateralAmount);
        // Convert to integer representation (e.g. 1.23 -> 123 for 2 decimals)
        const amountInteger = Math.floor(
          amountFloat * 10 ** Math.min(8, decimals),
        );
        // Scale to full decimal precision
        const multiplier = BigInt(10 ** Math.max(0, decimals - 8));
        const amountBigInt = BigInt(amountInteger) * multiplier;
        rawAmount = amountBigInt.toString();
      } catch {
        // Fallback calculation
        rawAmount = String(
          Math.floor(parseFloat(collateralAmount) * 10 ** decimals),
        );
      }

      // Get the actual rune ID from collateralRuneInfo if available
      // This ensures we're using the correct ID format (e.g., "810010:907")
      let runeIdForApi = collateralAsset.id;

      if (collateralRuneInfo?.id?.includes(":")) {
        runeIdForApi = collateralRuneInfo.id;
      }

      const result: LiquidiumBorrowQuoteResponse =
        await fetchBorrowQuotesFromApi(
          runeIdForApi, // Use the correct rune ID format for the API call
          rawAmount,
          address,
        );

      if (result?.runeDetails) {
        // Extract min-max range if available
        if (result.runeDetails.valid_ranges?.rune_amount?.ranges?.length > 0) {
          const ranges = result.runeDetails.valid_ranges.rune_amount.ranges;

          // Find global min and max across all ranges
          let globalMin = BigInt(ranges[0].min);
          let globalMax = BigInt(ranges[0].max);

          // Compare with other ranges to find global min and max
          for (let i = 1; i < ranges.length; i++) {
            const currentMin = BigInt(ranges[i].min);
            const currentMax = BigInt(ranges[i].max);

            if (currentMin < globalMin) globalMin = currentMin;
            if (currentMax > globalMax) globalMax = currentMax;
          }

          // Convert raw values to formatted values based on decimals
          const decimals = collateralRuneInfo?.decimals ?? 0;
          const minFormatted = formatRuneAmount(globalMin.toString(), decimals);
          const maxFormatted = formatRuneAmount(globalMax.toString(), decimals);

          setMinMaxRange(`Min: ${minFormatted} - Max: ${maxFormatted}`);
        } else {
          setMinMaxRange(null);
        }

        // Process offers
        if (result.runeDetails.offers) {
          setQuotes(result.runeDetails.offers);
          if (result.runeDetails.offers.length === 0) {
            setQuotesError("No loan offers available for this amount.");
          }
        } else {
          setQuotes([]);
          setQuotesError("No loan offers found or invalid response.");
        }
      } else {
        setQuotes([]);
        setQuotesError("No loan offers found or invalid response.");
        setMinMaxRange(null);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch quotes.";
      setQuotesError(errorMessage);
      setQuotes([]);
      setMinMaxRange(null);
    } finally {
      setIsQuotesLoading(false);
    }
  };

  const handleStartLoan = async () => {
    if (
      !selectedQuoteId ||
      !collateralAsset ||
      !collateralAmount ||
      !address ||
      !paymentAddress ||
      !publicKey ||
      !paymentPublicKey
    ) {
      setLoanProcessError(
        "Missing required information (quote, asset, amount, or wallet details).",
      );
      return;
    }

    setIsPreparing(true);
    setLoanProcessError(null);
    setLoanTxId(null);

    try {
      // 1. Prepare Loan
      const decimals = collateralRuneInfo?.decimals ?? 0;

      // Calculate raw amount with proper decimal handling
      let rawTokenAmount;
      try {
        // Pure BigInt calculation to maintain precision
        const amountFloat = parseFloat(collateralAmount);
        // Convert to integer representation (e.g. 1.23 -> 123 for 2 decimals)
        const amountInteger = Math.floor(
          amountFloat * 10 ** Math.min(8, decimals),
        );
        // Scale to full decimal precision
        const multiplier = BigInt(10 ** Math.max(0, decimals - 8));
        const amountBigInt = BigInt(amountInteger) * multiplier;
        rawTokenAmount = amountBigInt.toString();
      } catch {
        // Fallback calculation
        rawTokenAmount = String(
          Math.floor(parseFloat(collateralAmount) * 10 ** decimals),
        );
      }

      const feeRate = 5; // Use a default fee rate for MVP

      const prepareResult: LiquidiumPrepareBorrowResponse =
        await prepareLiquidiumBorrow({
          instant_offer_id: selectedQuoteId,
          fee_rate: feeRate,
          token_amount: rawTokenAmount,
          borrower_payment_address: paymentAddress,
          borrower_payment_pubkey: paymentPublicKey,
          borrower_ordinal_address: address,
          borrower_ordinal_pubkey: publicKey,
          address: address, // Pass user address for JWT lookup
        });

      if (
        !prepareResult.success ||
        !prepareResult.data?.base64_psbt ||
        !prepareResult.data?.prepare_offer_id
      ) {
        throw new Error(
          typeof prepareResult.error === "string"
            ? prepareResult.error
            : "Failed to prepare loan transaction.",
        );
      }

      // We have the prepared data for signing

      // 2. Sign PSBT
      setIsPreparing(false);
      setIsSigning(true);
      const psbtToSign = prepareResult.data.base64_psbt;
      const signResult = await signPsbt(psbtToSign); // Assuming signPsbt handles base64

      if (!signResult?.signedPsbtBase64) {
        throw new Error("User canceled the request");
      }
      const signedPsbtBase64 = signResult.signedPsbtBase64;

      // 3. Submit Loan
      setIsSigning(false);
      setIsSubmitting(true);

      const submitResult: LiquidiumSubmitBorrowResponse =
        await submitLiquidiumBorrow({
          signed_psbt_base_64: signedPsbtBase64,
          prepare_offer_id: prepareResult.data.prepare_offer_id,
          address: address, // Pass user address for JWT lookup
        });

      if (!submitResult.success || !submitResult.data?.loan_transaction_id) {
        throw new Error(
          typeof submitResult.error === "string"
            ? submitResult.error
            : "Failed to submit loan transaction.",
        );
      }

      setLoanTxId(submitResult.data.loan_transaction_id);
      // Optionally clear form or show success message
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start loan.";
      setLoanProcessError(errorMessage);
    } finally {
      setIsPreparing(false);
      setIsSigning(false);
      setIsSubmitting(false);
    }
  };

  // Asset selector is now handled by the InputArea component

  // --- Render Logic ---
  const isLoading = isQuotesLoading || isPreparing || isSigning || isSubmitting;
  const canGetQuotes =
    connected &&
    collateralAsset &&
    parseFloat(collateralAmount) > 0 &&
    !isLoading;
  const canStartLoan = connected && selectedQuoteId && !isLoading && !loanTxId;

  return (
    <div className={styles.borrowTabContainer}>
      <h1 className="heading">Borrow Against Runes</h1>

      {/* Collateral Input Area */}
      <InputArea
        label="Collateral Amount (Rune)"
        inputId="collateral-amount"
        inputValue={collateralAmount}
        onInputChange={(value) => {
          setCollateralAmount(value);
          // Reset quotes when amount changes
          setQuotes([]);
          setSelectedQuoteId(null);
          setQuotesError(null);
          // Don't reset min-max range when input changes
        }}
        placeholder="0.0"
        min="0"
        step="any" // Allow decimals
        disabled={isLoading}
        assetSelectorEnabled={true}
        selectedAsset={collateralAsset}
        onAssetChange={handleSelectCollateral}
        availableAssets={popularRunes}
        showBtcInSelector={false} // Only allow selecting runes for collateral
        isAssetsLoading={isPopularLoading}
        assetsError={popularError}
        showPercentageShortcuts={connected && !!collateralAsset}
        onPercentageClick={(percentage) => {
          if (!connected || !collateralAsset) return;

          const rawBalance = getSpecificRuneBalance(collateralAsset.name);
          if (!rawBalance) return;

          const balanceNum = parseFloat(rawBalance);
          if (isNaN(balanceNum)) return;

          const decimals = collateralRuneInfo?.decimals ?? 0;
          const availableBalance = balanceNum / 10 ** decimals;

          // Calculate percentage of available balance
          const newAmount =
            percentage === 1 ? availableBalance : availableBalance * percentage;

          // Format with appropriate decimal places
          const formattedAmount =
            Math.floor(newAmount * 10 ** decimals) / 10 ** decimals;

          // Set the amount and reset quotes
          setCollateralAmount(formattedAmount.toString());
          setQuotes([]);
          setSelectedQuoteId(null);
          setQuotesError(null);
          // Don't reset min-max range when using percentage shortcuts
        }}
        availableBalance={
          connected && collateralAsset && !collateralAsset.isBTC ? (
            isRuneBalancesLoading || isCollateralRuneInfoLoading ? (
              "Loading..."
            ) : (
              <FormattedRuneAmount
                runeName={collateralAsset.name}
                rawAmount={getSpecificRuneBalance(collateralAsset.name)}
              />
            )
          ) : null
        }
        usdValue={
          collateralAmount &&
          parseFloat(collateralAmount) > 0 &&
          collateralRuneMarketInfo?.price_in_usd
            ? (
                parseFloat(collateralAmount) *
                collateralRuneMarketInfo.price_in_usd
              ).toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : undefined
        }
        minMaxRange={minMaxRange || undefined}
      />

      {/* Borrow Range Error */}
      {borrowRangeError && (
        <div className="errorText" style={{ marginBottom: 8 }}>
          {borrowRangeError}
        </div>
      )}

      {/* Get Quotes Button */}
      <Button onClick={handleGetQuotes} disabled={!canGetQuotes || isLoading}>
        {isQuotesLoading ? "Fetching Quotes..." : "Get Loan Quotes"}
      </Button>

      {/* Display Quotes */}
      {quotesError && <div className="errorText">{quotesError}</div>}
      {quotes.length > 0 && (
        <div
          className={styles.infoArea}
          style={{ marginTop: "var(--space-4)", borderTop: "none" }}
        >
          <h2
            className="heading"
            style={{
              fontSize: "var(--font-size-normal)",
              marginBottom: "var(--space-2)",
            }}
          >
            Available Loan Offers:
          </h2>
          {quotes.map((quote) => {
            const principalBtc = (
              quote.loan_breakdown.principal_sats / 1e8
            ).toFixed(8);
            const repaymentBtc = (
              quote.loan_breakdown.total_repayment_sats / 1e8
            ).toFixed(8);
            const interestPercent = (
              (quote.loan_breakdown.interest_sats /
                quote.loan_breakdown.principal_sats) *
              100
            ).toFixed(2);
            return (
              <div
                key={quote.offer_id}
                onClick={() => setSelectedQuoteId(quote.offer_id)}
                style={{
                  border:
                    selectedQuoteId === quote.offer_id
                      ? "2px solid var(--win98-blue)"
                      : "2px solid var(--win98-gray)",
                  padding: "var(--space-2)",
                  marginBottom: "var(--space-2)",
                  cursor: "pointer",
                  backgroundColor:
                    selectedQuoteId === quote.offer_id
                      ? "var(--win98-light-gray)"
                      : "var(--win98-white)",
                }}
                className={styles.inputArea} // Reuse inputArea style for border
              >
                <p>
                  <strong>Loan Amount:</strong> {principalBtc} BTC
                </p>
                <p>
                  <strong>LTV:</strong>{" "}
                  {(Number(quote.ltv_rate) * 100).toFixed(2)}%
                </p>
                <p>
                  <strong>Term:</strong> {quote.loan_term_days ?? "N/A"} days
                </p>
                <p>
                  <strong>Interest:</strong> {interestPercent}% (
                  {quote.loan_breakdown.interest_sats} sats)
                </p>
                <p>
                  <strong>Total Repayment:</strong> {repaymentBtc} BTC
                </p>
                <p>
                  <strong>Due:</strong>{" "}
                  {new Date(
                    quote.loan_breakdown.loan_due_by_date,
                  ).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Start Loan Button */}
      {selectedQuoteId && (
        <Button onClick={handleStartLoan} disabled={!canStartLoan}>
          {isPreparing
            ? "Preparing..."
            : isSigning
              ? "Waiting for Signature..."
              : isSubmitting
                ? "Submitting..."
                : "Start Loan"}
        </Button>
      )}

      {/* Display Loan Process Status/Error/Success */}
      {loanProcessError && (
        <div className={`errorText ${styles.messageWithIcon}`}>
          <Image
            src="/icons/msg_error-0.png"
            alt="Error"
            className={styles.messageIcon}
            width={16}
            height={16}
          />
          <span>Error: {loanProcessError}</span>
        </div>
      )}
      {loanTxId && (
        <div className={`${styles.messageWithIcon} ${styles.successMessage}`}>
          <Image
            src="/icons/check-0.png"
            alt="Success"
            className={styles.messageIcon}
            width={16}
            height={16}
          />
          <div className={styles.successContent}>
            <p className={styles.successTitle}>Loan started successfully!</p>
            <p className={styles.successDetails}>
              Your loan has been initiated. It will appear in your portfolio
              shortly.
            </p>
            <div className={styles.successButtons}>
              <Button
                onClick={() => {
                  // Navigate to the portfolio tab
                  window.location.href = "/?tab=portfolio";
                }}
                style={{ marginRight: "var(--space-2)" }}
              >
                View Portfolio
              </Button>
              <Button
                onClick={() => {
                  // Reset the loan process to start a new loan
                  setLoanTxId(null);
                  setSelectedQuoteId(null);
                  setQuotes([]);
                  setLoanProcessError(null);
                }}
              >
                Start Another Loan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BorrowTab;
