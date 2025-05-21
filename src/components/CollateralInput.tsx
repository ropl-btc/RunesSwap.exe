import React from "react";
import { Asset } from "@/types/common";
import InputArea from "./InputArea";

interface CollateralInputProps {
  connected: boolean;
  collateralAsset: Asset | null;
  onCollateralAssetChange: (asset: Asset) => void;
  collateralAmount: string;
  onCollateralAmountChange: (value: string) => void;
  availableAssets: Asset[];
  isAssetsLoading?: boolean;
  assetsError?: string | null;
  availableBalance?: React.ReactNode;
  usdValue?: string;
  minMaxRange?: string;
  disabled?: boolean;
  onPercentageClick?: (percentage: number) => void;
}

const CollateralInput: React.FC<CollateralInputProps> = ({
  connected,
  collateralAsset,
  onCollateralAssetChange,
  collateralAmount,
  onCollateralAmountChange,
  availableAssets,
  isAssetsLoading = false,
  assetsError = null,
  availableBalance,
  usdValue,
  minMaxRange,
  disabled = false,
  onPercentageClick,
}) => (
  <InputArea
    label="Collateral Amount (Rune)"
    inputId="collateral-amount"
    inputValue={collateralAmount}
    onInputChange={onCollateralAmountChange}
    placeholder="0.0"
    min="0"
    step="any"
    disabled={disabled}
    assetSelectorEnabled
    selectedAsset={collateralAsset}
    onAssetChange={onCollateralAssetChange}
    availableAssets={availableAssets}
    showBtcInSelector={false}
    isAssetsLoading={isAssetsLoading}
    assetsError={assetsError}
    showPercentageShortcuts={connected && !!collateralAsset}
    onPercentageClick={onPercentageClick}
    availableBalance={availableBalance}
    usdValue={usdValue}
    minMaxRange={minMaxRange}
  />
);

export default CollateralInput;
