"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./RunesInfoTab.module.css";
import {
  type RuneInfo as OrdiscanRuneInfo,
  type RuneMarketInfo as OrdiscanRuneMarketInfo,
} from "@/types/ordiscan";
import { fetchRuneInfoFromApi, fetchRuneMarketFromApi } from "@/lib/api";
import { useRunesInfoStore } from "@/store/runesInfoStore";
import type { RuneData } from "@/lib/runesData";
import type { Rune } from "@/types/satsTerminal";
import RuneSearchBar from "./RuneSearchBar";
import RuneDetails from "./RuneDetails";

interface RunesInfoTabProps {
  cachedPopularRunes?: Record<string, unknown>[];
  isPopularRunesLoading?: boolean;
  popularRunesError?: Error | null;
  onShowPriceChart?: (assetName?: string, shouldToggle?: boolean) => void;
  showPriceChart?: boolean;
}

export function RunesInfoTab({
  cachedPopularRunes = [],
  isPopularRunesLoading = false,
  popularRunesError = null,
  onShowPriceChart,
  showPriceChart = false,
}: RunesInfoTabProps) {
  const { selectedRuneInfo: persistedSelectedRuneInfo, setSelectedRuneInfo } =
    useRunesInfoStore();

  const [selectedRuneForInfo, setSelectedRuneForInfo] =
    useState<OrdiscanRuneInfo | null>(persistedSelectedRuneInfo);
  const [showLoading, setShowLoading] = useState(false);

  const {
    data: detailedRuneInfo,
    isLoading: isDetailedRuneInfoLoading,
    error: detailedRuneInfoError,
  } = useQuery<RuneData | null, Error>({
    queryKey: ["runeInfoApi", selectedRuneForInfo?.name],
    queryFn: () =>
      selectedRuneForInfo
        ? fetchRuneInfoFromApi(selectedRuneForInfo.name)
        : Promise.resolve(null),
    enabled: !!selectedRuneForInfo,
    staleTime: Infinity,
  });

  const {
    data: runeMarketInfo,
    isLoading: isRuneMarketInfoLoading,
    error: runeMarketInfoError,
  } = useQuery<OrdiscanRuneMarketInfo | null, Error>({
    queryKey: ["runeMarketApi", selectedRuneForInfo?.name],
    queryFn: () =>
      selectedRuneForInfo
        ? fetchRuneMarketFromApi(selectedRuneForInfo.name)
        : Promise.resolve(null),
    enabled: !!selectedRuneForInfo,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (detailedRuneInfo || detailedRuneInfoError) {
      setShowLoading(false);
    }

    if (detailedRuneInfo) {
      const updatedInfo: OrdiscanRuneInfo = {
        ...detailedRuneInfo,
        formatted_name:
          detailedRuneInfo.formatted_name || detailedRuneInfo.name,
      } as OrdiscanRuneInfo;

      setSelectedRuneInfo(updatedInfo);
    } else if (detailedRuneInfoError && selectedRuneForInfo) {
      setSelectedRuneInfo(selectedRuneForInfo);
    }
  }, [
    detailedRuneInfo,
    detailedRuneInfoError,
    selectedRuneForInfo,
    setSelectedRuneInfo,
  ]);

  const handleRuneSelect = (rune: Rune) => {
    const minimalRuneInfo: OrdiscanRuneInfo = {
      id: rune.id,
      name: rune.name,
      formatted_name: rune.name,
      symbol: rune.name.split("•")[0] || rune.name,
      decimals: 0,
      number: 0,
      etching_txid: "",
      premined_supply: "0",
      current_supply: "0",
    } as OrdiscanRuneInfo;

    setTimeout(() => {
      setSelectedRuneForInfo(minimalRuneInfo);
      setShowLoading(true);
      if (showPriceChart && onShowPriceChart) {
        onShowPriceChart(rune.name, false);
      }
    }, 200);
  };

  return (
    <div className={styles.runesInfoTabContainer}>
      <h1 className="heading">Runes Info</h1>
      <RuneSearchBar
        onRuneSelect={handleRuneSelect}
        selectedRuneName={selectedRuneForInfo?.name || null}
        cachedPopularRunes={cachedPopularRunes}
        isPopularRunesLoading={isPopularRunesLoading}
        popularRunesError={popularRunesError}
      />
      <RuneDetails
        selectedRune={selectedRuneForInfo}
        detailedRuneInfo={detailedRuneInfo ?? null}
        detailedRuneInfoError={detailedRuneInfoError ?? null}
        isDetailedRuneInfoLoading={isDetailedRuneInfoLoading}
        runeMarketInfo={runeMarketInfo ?? null}
        isRuneMarketInfoLoading={isRuneMarketInfoLoading}
        runeMarketInfoError={runeMarketInfoError ?? null}
        showLoading={showLoading}
        onShowPriceChart={onShowPriceChart}
        showPriceChart={showPriceChart}
      />
    </div>
  );
}

export default RunesInfoTab;
