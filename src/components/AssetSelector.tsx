import React, { useState, Fragment } from "react";
import Image from "next/image";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/solid";
import styles from "./InputArea.module.css";
import { Asset, BTC_ASSET } from "@/types/common";
import { fetchRunesFromApi } from "@/lib/apiClient";
import type { Rune } from "@/types/satsTerminal";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDots, setLoadingDots] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  React.useEffect(() => {
    const shouldAnimate =
      isAssetsLoading || isPreselectedAssetLoading || isSearching;

    if (!shouldAnimate) {
      setLoadingDots("");
      return;
    }

    const interval = setInterval(() => {
      setLoadingDots((prev) => (prev === "..." ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, [isAssetsLoading, isPreselectedAssetLoading, isSearching]);

  const isValidImageSrc = (src?: string | null): src is string => {
    if (!src || typeof src !== "string") return false;
    return (
      src.startsWith("http") || src.startsWith("/") || src.startsWith("data:")
    );
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results: Rune[] = await fetchRunesFromApi(query);
      const mappedResults: Asset[] = results.map((rune) => ({
        id: rune.id,
        name: rune.name,
        imageURI: rune.imageURI,
        isBTC: false,
      }));
      setSearchResults(mappedResults);
    } catch (error: unknown) {
      setSearchError(
        error instanceof Error ? error.message : "Failed to search",
      );
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const displayedAssets = searchQuery.trim() ? searchResults : availableAssets;
  const isLoadingAssets = searchQuery.trim() ? isSearching : isAssetsLoading;
  const currentError = searchQuery.trim() ? searchError : assetsError;

  return (
    <div className={styles.listboxContainer}>
      <Listbox
        value={selectedAsset}
        onChange={onAssetChange}
        disabled={disabled || isAssetsLoading || isPreselectedAssetLoading}
      >
        <div className={styles.listboxRelative}>
          <Listbox.Button className={styles.listboxButton}>
            <span className={styles.listboxButtonText}>
              {isPreselectedAssetLoading ? (
                <span className={styles.loadingText}>
                  Loading Rune{loadingDots}
                </span>
              ) : (
                <>
                  {isValidImageSrc(selectedAsset?.imageURI) ? (
                    <Image
                      src={selectedAsset.imageURI!}
                      alt={`${selectedAsset.name} logo`}
                      className={styles.assetButtonImage}
                      width={24}
                      height={24}
                      aria-hidden="true"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target) target.style.display = "none";
                      }}
                    />
                  ) : null}
                  {isAssetsLoading
                    ? `Loading${loadingDots}`
                    : selectedAsset
                      ? selectedAsset.name
                      : "Select Asset"}
                </>
              )}
            </span>
            <span className={styles.listboxButtonIconContainer}>
              <ChevronUpDownIcon
                className={styles.listboxButtonIcon}
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className={styles.listboxOptions}>
              <div className={styles.searchContainer}>
                <div className={styles.searchWrapper}>
                  <Image
                    src="/icons/magnifying_glass-0.png"
                    alt="Search"
                    className={styles.searchIconEmbedded}
                    width={16}
                    height={16}
                  />
                  <input
                    type="text"
                    placeholder="Search runes..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              {isLoadingAssets && (
                <div className={styles.listboxLoadingOrEmpty}>
                  Loading Runes{loadingDots}
                </div>
              )}
              {!isLoadingAssets && currentError && (
                <div
                  className={`${styles.listboxError} ${styles.messageWithIcon}`}
                >
                  <Image
                    src="/icons/msg_error-0.png"
                    alt="Error"
                    className={styles.messageIcon}
                    width={16}
                    height={16}
                  />
                  <span>{currentError}</span>
                </div>
              )}
              {!isLoadingAssets &&
                !currentError &&
                displayedAssets.length === 0 && (
                  <div className={styles.listboxLoadingOrEmpty}>
                    {searchQuery
                      ? "No matching runes found"
                      : "No runes available"}
                  </div>
                )}

              {showBtcInSelector &&
                (searchQuery.trim() === "" ||
                  BTC_ASSET.name
                    .toLowerCase()
                    .includes(searchQuery.trim().toLowerCase())) && (
                  <Listbox.Option
                    key={BTC_ASSET.id}
                    className={({ active }) =>
                      `${styles.listboxOption} ${active ? styles.listboxOptionActive : styles.listboxOptionInactive}`
                    }
                    value={BTC_ASSET}
                  >
                    {({ selected }) => (
                      <>
                        <span className={styles.runeOptionContent}>
                          {isValidImageSrc(BTC_ASSET.imageURI) ? (
                            <Image
                              src={BTC_ASSET.imageURI}
                              alt=""
                              className={styles.runeImage}
                              width={24}
                              height={24}
                              aria-hidden="true"
                            />
                          ) : null}
                          <span
                            className={`${styles.listboxOptionText} ${selected ? styles.listboxOptionTextSelected : styles.listboxOptionTextUnselected}`}
                          >
                            {BTC_ASSET.name}
                          </span>
                        </span>
                        {selected && (
                          <span className={styles.listboxOptionCheckContainer}>
                            <CheckIcon
                              className={styles.listboxOptionCheckIcon}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                )}

              {displayedAssets
                .filter((asset: Asset) => asset.id !== BTC_ASSET.id)
                .map((asset: Asset) => (
                  <Listbox.Option
                    key={asset.id}
                    className={({ active }) =>
                      `${styles.listboxOption} ${active ? styles.listboxOptionActive : styles.listboxOptionInactive}`
                    }
                    value={asset}
                  >
                    {({ selected }) => (
                      <>
                        <span className={styles.runeOptionContent}>
                          {isValidImageSrc(asset.imageURI) ? (
                            <Image
                              src={asset.imageURI}
                              alt=""
                              className={styles.runeImage}
                              width={24}
                              height={24}
                              aria-hidden="true"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target) {
                                  target.style.display = "none";
                                }
                              }}
                            />
                          ) : null}
                          <span
                            className={`${styles.listboxOptionText} ${selected ? styles.listboxOptionTextSelected : styles.listboxOptionTextUnselected}`}
                          >
                            {asset.name}
                          </span>
                        </span>
                        {selected && (
                          <span className={styles.listboxOptionCheckContainer}>
                            <CheckIcon
                              className={styles.listboxOptionCheckIcon}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default AssetSelector;
