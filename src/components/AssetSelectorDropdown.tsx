import React, { Fragment } from "react";
import Image from "next/image";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/solid";
import styles from "./InputArea.module.css";
import { Asset, BTC_ASSET } from "@/types/common";

interface AssetSelectorDropdownProps {
  selectedAsset: Asset | null;
  onAssetChange: (asset: Asset) => void;
  availableAssets: Asset[];
  disabled?: boolean;
  showBtcInSelector?: boolean;
  isAssetsLoading?: boolean;
  assetsError?: string | null;
  isPreselectedAssetLoading?: boolean;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loadingDots: string;
}

const AssetSelectorDropdown: React.FC<AssetSelectorDropdownProps> = ({
  selectedAsset,
  onAssetChange,
  availableAssets,
  disabled = false,
  showBtcInSelector = true,
  isAssetsLoading = false,
  assetsError = null,
  isPreselectedAssetLoading = false,
  searchQuery,
  onSearchChange,
  loadingDots,
}) => {
  const isValidImageSrc = (src?: string | null): src is string => {
    if (!src || typeof src !== "string") return false;
    return (
      src.startsWith("http") || src.startsWith("/") || src.startsWith("data:")
    );
  };

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
                    onChange={onSearchChange}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              {isAssetsLoading && (
                <div className={styles.listboxLoadingOrEmpty}>
                  Loading Runes{loadingDots}
                </div>
              )}
              {!isAssetsLoading && assetsError && (
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
                  <span>{assetsError}</span>
                </div>
              )}
              {!isAssetsLoading &&
                !assetsError &&
                availableAssets.length === 0 && (
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

              {availableAssets
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

export default AssetSelectorDropdown;
