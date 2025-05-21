import React from "react";
import { Asset } from "@/types/common";
import useAssetSearch from "@/hooks/useAssetSearch";
import AssetSelectorDropdown from "./AssetSelectorDropdown";

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
    availableAssets: searchAssets,
    isLoadingAssets,
    currentError,
  } = useAssetSearch();

  // Merge assets passed via props with those from the hook when no search query
  const combinedAssets = searchQuery.trim() ? searchAssets : availableAssets;
  const loading = searchQuery.trim() ? isLoadingAssets : isAssetsLoading;
  const error = searchQuery.trim() ? currentError : assetsError;

  return (
    <AssetSelectorDropdown
      selectedAsset={selectedAsset}
      onAssetChange={onAssetChange}
      availableAssets={combinedAssets}
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
      disabled={disabled}
      showBtcInSelector={showBtcInSelector}
      isAssetsLoading={loading}
      assetsError={error}
      isPreselectedAssetLoading={isPreselectedAssetLoading}
    />
  );
};

export default AssetSelector;
