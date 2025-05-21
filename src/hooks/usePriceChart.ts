import { useState } from "react";
import usePriceHistory from "./usePriceHistory";

export type Timeframe = "24h" | "7d" | "30d" | "90d";

export default function usePriceChart(
  assetName: string,
  defaultTimeframe: Timeframe = "24h",
) {
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<Timeframe>(defaultTimeframe);
  const [showTooltip, setShowTooltip] = useState(false);

  const priceHistory = usePriceHistory(assetName, selectedTimeframe);

  return {
    ...priceHistory,
    selectedTimeframe,
    setSelectedTimeframe,
    showTooltip,
    setShowTooltip,
  };
}
