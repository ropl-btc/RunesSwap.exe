import React, { ReactNode, useState, Fragment } from "react";
import Image from "next/image";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/solid";
import styles from "./InputArea.module.css";
import { Asset, BTC_ASSET } from "@/types/common";
import { fetchRunesFromApi } from "@/lib/apiClient";
import type { Rune } from "@/types/satsTerminal";

interface InputAreaProps {
  // Label/Title
  label: string;

  // Input field props
  inputId: string;
  inputValue: string;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  min?: string;
  step?: string;

  // Asset selector props (optional)
  assetSelectorEnabled?: boolean;
  selectedAsset?: Asset | null;
  onAssetChange?: (asset: Asset) => void;
  availableAssets?: Asset[];
  showBtcInSelector?: boolean;
  isAssetsLoading?: boolean;
  assetsError?: string | null;
  isPreselectedAssetLoading?: boolean;

  // Legacy support for external asset selector
  assetSelectorComponent?: ReactNode;

  // Balance and percentage shortcuts (optional)
  showPercentageShortcuts?: boolean;
  onPercentageClick?: (percentage: number) => void;
  availableBalance?: ReactNode;

  // USD value (optional)
  usdValue?: string;

  // Min-Max range (optional)
  minMaxRange?: string;

  // Error message (optional)
  errorMessage?: string;

  // Additional content to render at the bottom
  bottomContent?: ReactNode;
}

export const InputArea: React.FC<InputAreaProps> = ({
  label,
  inputId,
  inputValue,
  onInputChange,
  placeholder = "0.0",
  readOnly = false,
  disabled = false,
  min = "0",
  step = "0.001",
  assetSelectorEnabled = false,
  selectedAsset = null,
  onAssetChange,
  availableAssets = [],
  showBtcInSelector = true,
  isAssetsLoading = false,
  assetsError = null,
  isPreselectedAssetLoading = false,
  assetSelectorComponent, // Legacy support
  showPercentageShortcuts = false,
  onPercentageClick,
  availableBalance,
  usdValue,
  minMaxRange,
  errorMessage,
  bottomContent,
}) => {
  // State for search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDots, setLoadingDots] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Loading dots animation
  React.useEffect(() => {
    const shouldAnimate =
      isAssetsLoading ||
      isPreselectedAssetLoading ||
      isSearching ||
      inputValue?.includes("Loading");

    if (!shouldAnimate) {
      // Reset loading dots when animation should stop
      setLoadingDots("");
      return;
    }

    const interval = setInterval(() => {
      setLoadingDots((prev) => (prev === "..." ? "" : prev + "."));
    }, 500);

    // Always return the cleanup function
    return () => clearInterval(interval);
  }, [isAssetsLoading, isPreselectedAssetLoading, isSearching, inputValue]);

  // Function to check if a string is a valid image src
  const isValidImageSrc = (src?: string | null): src is string => {
    if (!src || typeof src !== "string") return false;
    return (
      src.startsWith("http") || src.startsWith("/") || src.startsWith("data:")
    );
  };

  // Handle search input change
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
      // Fetch results from API
      const results: Rune[] = await fetchRunesFromApi(query);

      // Map results to Asset type for consistency
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

  // Determine which assets to display
  const displayedAssets = searchQuery.trim() ? searchResults : availableAssets;
  const isLoadingAssets = searchQuery.trim() ? isSearching : isAssetsLoading;
  const currentError = searchQuery.trim() ? searchError : assetsError;

  // Render the asset selector
  const renderAssetSelector = () => {
    if (!assetSelectorEnabled) return null;

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
                        src={selectedAsset.imageURI}
                        alt={`${selectedAsset.name} logo`}
                        className={styles.assetButtonImage}
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
                {/* Search input */}
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

                {/* Loading and error states */}
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

                {/* BTC option (conditionally shown) */}
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
                            <span
                              className={styles.listboxOptionCheckContainer}
                            >
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

                {/* Rune options */}
                {displayedAssets
                  .filter((asset: Asset) => asset.id !== BTC_ASSET.id) // Filter out BTC as it's conditionally shown above
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
                            <span
                              className={styles.listboxOptionCheckContainer}
                            >
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

  return (
    <div className={styles.inputArea}>
      <div className={styles.inputHeader}>
        <label htmlFor={inputId} className={styles.inputLabel}>
          {label}
        </label>

        {/* Percentage shortcuts and available balance */}
        {(showPercentageShortcuts || availableBalance) && (
          <span className={styles.availableBalance}>
            {showPercentageShortcuts && onPercentageClick && (
              <span className={styles.percentageShortcuts}>
                <button
                  className={styles.percentageButton}
                  onClick={() => onPercentageClick(0.25)}
                  type="button"
                  disabled={disabled}
                >
                  25%
                </button>
                {" | "}
                <button
                  className={styles.percentageButton}
                  onClick={() => onPercentageClick(0.5)}
                  type="button"
                  disabled={disabled}
                >
                  50%
                </button>
                {" | "}
                <button
                  className={styles.percentageButton}
                  onClick={() => onPercentageClick(0.75)}
                  type="button"
                  disabled={disabled}
                >
                  75%
                </button>
                {" | "}
                <button
                  className={styles.percentageButton}
                  onClick={() => onPercentageClick(1)}
                  type="button"
                  disabled={disabled}
                >
                  Max
                </button>
                {availableBalance ? " • " : ""}
              </span>
            )}
            {availableBalance && <>Available: {availableBalance}</>}
          </span>
        )}
      </div>

      <div className={styles.inputRow}>
        <input
          type={readOnly ? "text" : "number"}
          id={inputId}
          placeholder={placeholder}
          value={inputValue}
          onChange={
            onInputChange ? (e) => onInputChange(e.target.value) : undefined
          }
          className={readOnly ? styles.amountInputReadOnly : styles.amountInput}
          readOnly={readOnly}
          disabled={disabled}
          min={min}
          step={step}
        />
        {/* Use either the built-in asset selector or the provided component */}
        {assetSelectorEnabled ? renderAssetSelector() : assetSelectorComponent}
      </div>

      {/* USD Value and Min-Max Range */}
      {(usdValue || minMaxRange) && (
        <div
          className={styles.usdValueText}
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <div>{usdValue && `≈ ${usdValue}`}</div>
          <div>{minMaxRange}</div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          className={`${styles.errorText} ${styles.messageWithIcon}`}
          style={{ paddingTop: "0.25rem", width: "100%" }}
        >
          <Image
            src="/icons/msg_error-0.png"
            alt="Error"
            className={styles.messageIcon}
            width={16}
            height={16}
          />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Additional Content */}
      {bottomContent}
    </div>
  );
};

export default InputArea;
