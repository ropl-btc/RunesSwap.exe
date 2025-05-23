import { Asset, BTC_ASSET } from "@/types/common";
import type { SwapProcessAction } from "@/components/swap/SwapProcessManager";
import { type QuoteResponse } from "satsterminal-sdk";

interface UseSwapAssetsArgs {
  popularRunes: Asset[];
  showPriceChart: boolean;
  onShowPriceChart?: (assetName?: string, shouldToggle?: boolean) => void;
  dispatchSwap: React.Dispatch<SwapProcessAction>;
  setQuote: React.Dispatch<React.SetStateAction<QuoteResponse | null>>;
  setExchangeRate: React.Dispatch<React.SetStateAction<string | null>>;
  setInputAmount: React.Dispatch<React.SetStateAction<string>>;
  setOutputAmount: React.Dispatch<React.SetStateAction<string>>;
  inputAmount: string;
  outputAmount: string;
  assetIn: Asset;
  assetOut: Asset | null;
  setAssetIn: React.Dispatch<React.SetStateAction<Asset>>;
  setAssetOut: React.Dispatch<React.SetStateAction<Asset | null>>;
}

export function useSwapAssets({
  popularRunes,
  showPriceChart,
  onShowPriceChart,
  dispatchSwap,
  setQuote,
  setExchangeRate,
  setInputAmount,
  setOutputAmount,
  inputAmount,
  outputAmount,
  assetIn,
  assetOut,
  setAssetIn,
  setAssetOut,
}: UseSwapAssetsArgs) {
  const clearQuoteState = () => {
    setQuote(null);
    dispatchSwap({ type: "FETCH_QUOTE_ERROR", error: "" });
    setExchangeRate(null);
  };

  const handleSwapDirection = () => {
    if (!assetOut) return;

    const tempAsset = assetIn;
    setAssetIn(assetOut);
    setAssetOut(tempAsset);

    const tempAmount = inputAmount;
    setInputAmount(outputAmount);
    setOutputAmount(tempAmount);

    clearQuoteState();
    dispatchSwap({ type: "RESET_SWAP" });
  };

  const handleSelectAssetIn = (selectedAsset: Asset) => {
    if (assetOut && selectedAsset.id === assetOut.id) {
      handleSwapDirection();
      return;
    }

    setAssetIn(selectedAsset);
    if (selectedAsset.isBTC) {
      if (!assetOut || assetOut.isBTC) {
        const newAssetOut = popularRunes.length > 0 ? popularRunes[0] : null;
        setAssetOut(newAssetOut);
      }
    } else {
      setAssetOut(BTC_ASSET);
    }

    setOutputAmount("");
    clearQuoteState();
  };

  const handleSelectAssetOut = (selectedAsset: Asset) => {
    if (assetIn && selectedAsset.id === assetIn.id) {
      handleSwapDirection();
      return;
    }

    const previousAssetIn = assetIn;
    setAssetOut(selectedAsset);

    if (showPriceChart) {
      onShowPriceChart?.(selectedAsset.name, false);
    }

    if (selectedAsset.isBTC) {
      if (!previousAssetIn || previousAssetIn.isBTC) {
        const newAssetIn =
          popularRunes.length > 0 ? popularRunes[0] : BTC_ASSET;
        setAssetIn(newAssetIn);
        setOutputAmount("");
      }
    } else {
      setAssetIn(BTC_ASSET);
      setOutputAmount("");
    }

    clearQuoteState();
  };

  return {
    assetIn,
    assetOut,
    setAssetIn,
    setAssetOut,
    handleSelectAssetIn,
    handleSelectAssetOut,
    handleSwapDirection,
  };
}

export default useSwapAssets;
