import React from 'react';
import { Asset } from '@/types/common';
import InputArea from './InputArea';

interface CollateralInputProps {
  connected: boolean;
  collateralAsset: Asset | null;
  onCollateralAssetChange: (asset: Asset) => void;
  collateralAmount: string;
  onCollateralAmountChange: (value: string) => void;
  availableAssets: Asset[];
  isAssetsLoading?: boolean | undefined;
  assetsError?: string | null | undefined;
  availableBalance?: React.ReactNode | undefined;
  usdValue: string | undefined;
  minMaxRange?: string | undefined;
  disabled?: boolean | undefined;
  onPercentageClick: ((percentage: number) => void) | undefined;
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
    errorMessage={undefined}
  />
);

export default CollateralInput;
