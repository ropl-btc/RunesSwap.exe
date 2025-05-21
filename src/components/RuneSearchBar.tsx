"use client";

import React from "react";
import Image from "next/image";
import styles from "./RunesInfoTab.module.css";
import useRunesSearch from "@/hooks/useRunesSearch";
import type { Rune } from "@/types/satsTerminal";

interface RuneSearchBarProps {
  onRuneSelect: (rune: Rune) => void;
  selectedRuneName?: string | null;
  cachedPopularRunes?: Record<string, unknown>[];
  isPopularRunesLoading?: boolean;
  popularRunesError?: Error | null;
}

const RuneSearchBar: React.FC<RuneSearchBarProps> = ({
  onRuneSelect,
  selectedRuneName,
  cachedPopularRunes = [],
  isPopularRunesLoading = false,
  popularRunesError = null,
}) => {
  const {
    searchQuery,
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlur,
    isSearchFocused,
    availableRunes,
    isLoadingRunes,
    currentRunesError,
  } = useRunesSearch({
    cachedPopularRunes,
    isPopularRunesLoading,
    popularRunesError,
  });

  return (
    <div className={styles.searchAndResultsContainer}>
      <div className={styles.searchContainerRunesInfo}>
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
            placeholder="Click to search or browse runes..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            className={styles.searchInput}
          />
        </div>
      </div>

      {(isSearchFocused || searchQuery.trim()) && (
        <div className={styles.runesListContainer}>
          {isLoadingRunes && (
            <div className={styles.listboxLoadingOrEmpty}>
              {searchQuery.trim()
                ? `Searching for "${searchQuery}"...`
                : "Loading Latest Runes..."}
            </div>
          )}
          {currentRunesError && (
            <div className={`${styles.listboxError} ${styles.messageWithIcon}`}>
              <Image
                src="/icons/msg_error-0.png"
                alt="Error"
                className={styles.messageIcon}
                width={16}
                height={16}
              />
              <span>{currentRunesError}</span>
            </div>
          )}
          {!isLoadingRunes &&
            !currentRunesError &&
            availableRunes.length === 0 && (
              <div className={styles.listboxLoadingOrEmpty}>
                {searchQuery.trim()
                  ? `Rune "${searchQuery}" not found.`
                  : "No recent runes found"}
              </div>
            )}
          {!isLoadingRunes &&
            !currentRunesError &&
            availableRunes.map((rune) => (
              <button
                key={rune.id}
                className={`${styles.runeListItem} ${selectedRuneName === rune.name ? styles.runeListItemSelected : ""}`}
                onClick={() => onRuneSelect(rune)}
              >
                <div className={styles.runeListItemContent}>
                  {rune.imageURI && (
                    <Image
                      src={rune.imageURI}
                      alt=""
                      className={styles.runeImage}
                      width={24}
                      height={24}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target) {
                          target.style.display = "none";
                        }
                      }}
                    />
                  )}
                  <span>{rune.name}</span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default RuneSearchBar;
