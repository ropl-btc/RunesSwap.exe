import { useQuery } from "@tanstack/react-query";
import { fetchRunePriceHistoryFromApi, QUERY_KEYS } from "@/lib/api";
import { useMemo } from "react";

export function usePriceHistory(
  assetName: string,
  timeframe: "24h" | "7d" | "30d" | "90d",
) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.RUNE_PRICE_HISTORY, assetName],
    queryFn: () => fetchRunePriceHistoryFromApi(assetName),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  function fillMissingHours(
    sortedData: { timestamp: number; price: number }[],
    hours: number,
    endTimestamp: number,
  ) {
    const filled: { timestamp: number; price: number }[] = [];
    let lastPrice = sortedData.length ? sortedData[0].price : undefined;
    let dataIdx = 0;
    for (let i = hours - 1; i >= 0; i--) {
      const ts = endTimestamp - i * 60 * 60 * 1000;
      while (
        dataIdx < sortedData.length &&
        sortedData[dataIdx].timestamp <= ts
      ) {
        lastPrice = sortedData[dataIdx].price;
        dataIdx++;
      }
      if (typeof lastPrice === "number") {
        filled.push({ timestamp: ts, price: lastPrice });
      }
    }
    return filled;
  }

  const { filteredPriceData, startTime, endTime } = useMemo(() => {
    if (!data?.prices || data.prices.length === 0) {
      return { filteredPriceData: [], startTime: null, endTime: null };
    }

    const sortedData = data.prices
      .map((p) => ({ ...p, price: p.price }))
      .filter(
        (p): p is { timestamp: number; price: number } =>
          typeof p.price === "number",
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    let now = Date.now();
    let windowStart: number;
    let hours = 0;
    switch (timeframe) {
      case "24h":
        hours = 24;
        windowStart = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        hours = 7 * 24;
        windowStart = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        hours = 30 * 24;
        windowStart = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "90d":
        windowStart = sortedData[0]?.timestamp || now;
        now = sortedData[sortedData.length - 1]?.timestamp || now;
        break;
    }

    let filtered;
    if (timeframe === "90d") {
      filtered = sortedData.filter(
        (p) => p.timestamp >= windowStart && p.timestamp <= now,
      );
    } else {
      filtered = fillMissingHours(sortedData, hours, now);
    }

    return {
      filteredPriceData: filtered,
      startTime: filtered.length > 0 ? new Date(filtered[0].timestamp) : null,
      endTime:
        filtered.length > 0
          ? new Date(filtered[filtered.length - 1].timestamp)
          : null,
    };
  }, [data, timeframe]);

  const getCustomTicks = useMemo(() => {
    if (!startTime || !endTime || filteredPriceData.length === 0) return [];

    const dataTimestamps = filteredPriceData.map((p) => p.timestamp);

    switch (timeframe) {
      case "24h": {
        const tickCount = Math.min(8, dataTimestamps.length);
        if (tickCount <= 2) return dataTimestamps;
        const step = Math.floor(dataTimestamps.length / (tickCount - 1));
        return dataTimestamps.filter(
          (_, i) => i % step === 0 || i === dataTimestamps.length - 1,
        );
      }
      case "7d":
      case "30d":
      case "90d": {
        const tickCount = 6;
        if (dataTimestamps.length <= tickCount) return dataTimestamps;
        const step = Math.floor(dataTimestamps.length / (tickCount - 1));
        return dataTimestamps.filter(
          (_, i) => i % step === 0 || i === dataTimestamps.length - 1,
        );
      }
    }
  }, [startTime, endTime, filteredPriceData, timeframe]);

  return {
    filteredPriceData,
    startTime,
    endTime,
    getCustomTicks,
    isLoading,
    isError,
  };
}

export default usePriceHistory;
