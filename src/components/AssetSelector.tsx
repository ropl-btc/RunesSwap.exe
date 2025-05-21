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

const AssetSelector: React.FC<AssetSelectorProps> = (props) => {
  const {
    searchQuery,
    handleSearchChange,
    displayedAssets,
    isLoadingAssets,
    error,
    loadingDots,
  } = useAssetSearch({
    availableAssets: props.availableAssets,
    isAssetsLoading: props.isAssetsLoading,
    assetsError: props.assetsError,
  });

  return (
    <AssetSelectorDropdown
      selectedAsset={props.selectedAsset}
      onAssetChange={props.onAssetChange}
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
      displayedAssets={displayedAssets}
      isLoadingAssets={isLoadingAssets}
      error={error}
      loadingDots={loadingDots}
      disabled={props.disabled}
      showBtcInSelector={props.showBtcInSelector}
      isPreselectedAssetLoading={props.isPreselectedAssetLoading}
    />
  );
};

export default AssetSelector;
