import React, { useEffect, useState } from 'react';
import useAssetSearch from '@/hooks/useAssetSearch';
import { Asset } from '@/types/common';
import AssetSelectorDropdown from './AssetSelectorDropdown';

interface AssetSelectorProps {
  selectedAsset: Asset | null;
  onAssetChange: (asset: Asset) => void;
  availableAssets: Asset[];
  disabled?: boolean;
  showBtcInSelector?: boolean;
  isAssetsLoading?: boolean;
  assetsError?: string | null;
  isPreselectedAssetLoading?: boolean;
}

const AssetSelector: React.FC<AssetSelectorProps> = ({
  selectedAsset,
  onAssetChange,
  availableAssets,
  disabled = false,
  showBtcInSelector = true,
  isAssetsLoading = false,
  assetsError = null,
  isPreselectedAssetLoading = false,
}) => {
  const {
    searchQuery,
    handleSearchChange,
    displayedAssets,
    isLoadingAssets,
    currentError,
  } = useAssetSearch({ availableAssets, isAssetsLoading, assetsError });

  const [loadingDots, setLoadingDots] = useState('');

  useEffect(() => {
    const shouldAnimate = isLoadingAssets || isPreselectedAssetLoading;

    if (!shouldAnimate) {
      setLoadingDots('');
      return;
    }

    const interval = setInterval(() => {
      setLoadingDots((prev) => (prev === '...' ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [isLoadingAssets, isPreselectedAssetLoading]);

  return (
    <AssetSelectorDropdown
      selectedAsset={selectedAsset}
      onAssetChange={onAssetChange}
      availableAssets={displayedAssets}
      disabled={disabled}
      showBtcInSelector={showBtcInSelector}
      isAssetsLoading={isLoadingAssets}
      assetsError={currentError}
      isPreselectedAssetLoading={isPreselectedAssetLoading}
      searchQuery={searchQuery}
      onSearchChange={(e) => handleSearchChange(e.target.value)}
      loadingDots={loadingDots}
    />
  );
};

export default AssetSelector;
