"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSharedLaserEyes } from "@/context/LaserEyesContext";
import styles from "./AppInterface.module.css";
import { fetchPopularFromApi, QUERY_KEYS } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import useBtcPrice from "@/hooks/useBtcPrice";

// Import the tab components
import SwapTab from "./SwapTab";
import RunesInfoTab from "./RunesInfoTab";
import YourTxsTab from "./YourTxsTab";
import PortfolioTab from "./PortfolioTab";
import BorrowTab from "./BorrowTab"; // <-- Import BorrowTab
import PriceChart from "./PriceChart";

// --- Props Interface --- Update the activeTab type
interface AppInterfaceProps {
  activeTab: "swap" | "runesInfo" | "yourTxs" | "portfolio" | "borrow"; // <-- Added 'borrow'
}
// --- End Props ---

// --- Component ---
export function AppInterface({ activeTab }: AppInterfaceProps) {
  const searchParams = useSearchParams();
  const preSelectedRune = searchParams.get("rune");

  const [showSwapTabPriceChart, setShowSwapTabPriceChart] = useState(false);
  const [showRunesInfoTabPriceChart, setShowRunesInfoTabPriceChart] =
    useState(false);

  const [swapTabSelectedAsset, setSwapTabSelectedAsset] = useState(
    preSelectedRune || "LIQUIDIUM•TOKEN",
  );
  const [runesInfoTabSelectedAsset, setRunesInfoTabSelectedAsset] =
    useState("LIQUIDIUM•TOKEN");

  useEffect(() => {
    if (preSelectedRune) {
      setSwapTabSelectedAsset(preSelectedRune);
    }
  }, [preSelectedRune]);

  const {
    connected,
    address,
    publicKey,
    paymentAddress,
    paymentPublicKey,
    signPsbt,
  } = useSharedLaserEyes();

  const { btcPriceUsd, isBtcPriceLoading, btcPriceError } = useBtcPrice();

  // Fetch popular runes using React Query for caching across tabs
  const {
    data: popularRunes,
    isLoading: isPopularRunesLoading,
    error: popularRunesError,
  } = useQuery<Record<string, unknown>[], Error>({
    queryKey: [QUERY_KEYS.POPULAR_RUNES],
    queryFn: () => fetchPopularFromApi(),
    staleTime: Infinity, // Data never goes stale, so React Query won't refetch
    gcTime: 365 * 24 * 60 * 60 * 1000, // Keep in cache for a year
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: false, // Don't retry on failure
  });

  const togglePriceChart = React.useCallback(
    (assetName?: string, shouldToggle: boolean = true) => {
      if (activeTab === "swap") {
        if (assetName) setSwapTabSelectedAsset(assetName);
        if (shouldToggle) setShowSwapTabPriceChart((prev) => !prev);
      } else if (activeTab === "runesInfo") {
        if (assetName) setRunesInfoTabSelectedAsset(assetName);
        if (shouldToggle) setShowRunesInfoTabPriceChart((prev) => !prev);
      }
      // No price chart planned for Borrow tab in MVP
    },
    [activeTab],
  );

  useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent) => {
      const { tab, rune } = event.detail;
      if (tab === "swap" && rune) {
        setSwapTabSelectedAsset(rune);
        if (showSwapTabPriceChart) {
          togglePriceChart(rune, false);
        }
      }
      // Handle other tab changes if needed
    };
    window.addEventListener("tabChange", handleTabChangeEvent as EventListener);
    return () =>
      window.removeEventListener(
        "tabChange",
        handleTabChangeEvent as EventListener,
      );
  }, [showSwapTabPriceChart, togglePriceChart]);

  const isPriceChartVisible =
    (activeTab === "swap" && showSwapTabPriceChart) ||
    (activeTab === "runesInfo" && showRunesInfoTabPriceChart);

  const selectedAssetForActiveTab =
    activeTab === "swap"
      ? swapTabSelectedAsset
      : activeTab === "runesInfo"
        ? runesInfoTabSelectedAsset
        : ""; // No specific asset needed for borrow chart yet
  const renderActiveTab = () => {
    switch (activeTab) {
      case "swap":
        return (
          <SwapTab
            connected={connected}
            address={address}
            paymentAddress={paymentAddress}
            publicKey={publicKey}
            paymentPublicKey={paymentPublicKey}
            signPsbt={signPsbt}
            btcPriceUsd={btcPriceUsd}
            isBtcPriceLoading={isBtcPriceLoading}
            btcPriceError={btcPriceError}
            cachedPopularRunes={popularRunes || []}
            isPopularRunesLoading={isPopularRunesLoading}
            popularRunesError={popularRunesError}
            onShowPriceChart={togglePriceChart}
            showPriceChart={showSwapTabPriceChart}
            preSelectedRune={preSelectedRune}
          />
        );
      // --- Add Borrow Tab Case ---
      case "borrow":
        return (
          <BorrowTab
            connected={connected}
            address={address}
            paymentAddress={paymentAddress} // Needed for prepare
            publicKey={publicKey} // Needed for prepare
            paymentPublicKey={paymentPublicKey} // Needed for prepare
            signPsbt={signPsbt} // Needed for submit
            btcPriceUsd={btcPriceUsd}
            isBtcPriceLoading={isBtcPriceLoading}
            btcPriceError={btcPriceError}
            cachedPopularRunes={popularRunes || []} // Pass popular runes
            isPopularRunesLoading={isPopularRunesLoading}
            popularRunesError={popularRunesError}
          />
        );
      // --- End Borrow Tab Case ---
      case "runesInfo":
        return (
          <RunesInfoTab
            cachedPopularRunes={popularRunes || []}
            isPopularRunesLoading={isPopularRunesLoading}
            popularRunesError={popularRunesError}
            onShowPriceChart={togglePriceChart}
            showPriceChart={showRunesInfoTabPriceChart}
          />
        );
      case "yourTxs":
        return <YourTxsTab connected={connected} address={address} />;
      case "portfolio":
        return <PortfolioTab />;
      default:
        // Optionally render SwapTab as default or null
        return (
          <SwapTab
            connected={connected}
            address={address}
            paymentAddress={paymentAddress}
            publicKey={publicKey}
            paymentPublicKey={paymentPublicKey}
            signPsbt={signPsbt}
            btcPriceUsd={btcPriceUsd}
            isBtcPriceLoading={isBtcPriceLoading}
            btcPriceError={btcPriceError}
            cachedPopularRunes={popularRunes || []}
            isPopularRunesLoading={isPopularRunesLoading}
            popularRunesError={popularRunesError}
            onShowPriceChart={togglePriceChart}
            showPriceChart={showSwapTabPriceChart}
            preSelectedRune={preSelectedRune}
          />
        );
    }
  };

  return (
    <div
      className={`${styles.container} ${isPriceChartVisible ? styles.containerWithChart : ""}`}
    >
      {/* Conditionally render layout based on whether price chart is needed */}
      {activeTab === "swap" || activeTab === "runesInfo" ? (
        <div className={styles.appLayout}>
          <div className={styles.swapContainer}>{renderActiveTab()}</div>
          {isPriceChartVisible && (
            <div className={styles.priceChartContainer}>
              <PriceChart
                assetName={selectedAssetForActiveTab}
                onClose={() => togglePriceChart(undefined, true)} // Pass true to ensure toggle happens
                btcPriceUsd={btcPriceUsd}
              />
            </div>
          )}
        </div>
      ) : (
        // Render tabs like Borrow, YourTxs, Portfolio directly
        renderActiveTab()
      )}
    </div>
  );
}

export default AppInterface;
