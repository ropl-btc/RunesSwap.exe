import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioDataFromApi, QUERY_KEYS } from "@/lib/api";

export type SortField = "name" | "balance" | "value";
export type SortDirection = "asc" | "desc";

interface RuneBalanceItem {
  name: string;
  formattedName: string;
  balance: string;
  imageURI?: string;
  usdValue: number;
  actualBalance: number;
  btcValue: number;
}

export function usePortfolioData(address: string | null) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [progress, setProgress] = useState(0); // 0 to 1
  const [stepText, setStepText] = useState("");

  const {
    data: portfolioData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_DATA, address],
    queryFn: () => fetchPortfolioDataFromApi(address || ""),
    enabled: !!address,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!isLoading) return;
    let isMounted = true;
    let step = 0;
    const totalSteps = 4;
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
        setTimeout(nextStep, 400 + Math.random() * 400);
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedBalances: RuneBalanceItem[] = useMemo(() => {
    if (!portfolioData?.balances?.length) return [] as RuneBalanceItem[];
    return [...portfolioData.balances]
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
        const imageURI = `https://icon.unisat.io/icon/runes/${encodeURIComponent(
          rune.name,
        )}`;
        return {
          ...rune,
          actualBalance,
          btcValue,
          usdValue,
          imageURI,
          formattedName: runeInfo?.formatted_name || rune.name,
        } as RuneBalanceItem;
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
  }, [portfolioData, sortField, sortDirection]);

  const totalBtcValue = useMemo(
    () => sortedBalances.reduce((sum, rune) => sum + rune.btcValue, 0),
    [sortedBalances],
  );

  const totalUsdValue = useMemo(
    () => sortedBalances.reduce((sum, rune) => sum + rune.usdValue, 0),
    [sortedBalances],
  );

  return {
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
  };
}
