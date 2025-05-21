import { useState, useEffect, useMemo } from "react";
import debounce from "lodash.debounce";
import { fetchRunesFromApi } from "@/lib/apiClient";
import { Asset } from "@/types/common";
import type { Rune } from "@/types/satsTerminal";

interface UseAssetSearchOptions {
  availableAssets: Asset[];
  isAssetsLoading?: boolean;
  assetsError?: string | null;
}

export interface AssetSearchResult {
  searchQuery: string;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  displayedAssets: Asset[];
  isLoadingAssets: boolean;
  error: string | null;
  loadingDots: string;
}

export default function useAssetSearch({
  availableAssets,
  isAssetsLoading = false,
  assetsError = null,
}: UseAssetSearchOptions): AssetSearchResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingDots, setLoadingDots] = useState("");

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) {
          setSearchResults([]);
          setIsSearching(false);
          setSearchError(null);
          return;
        }
        try {
          const results: Rune[] = await fetchRunesFromApi(query);
          const mapped = results.map<Asset>((rune) => ({
            id: rune.id,
            name: rune.name,
            imageURI: rune.imageURI,
            isBTC: false,
          }));
          setSearchResults(mapped);
        } catch (error: unknown) {
          setSearchError(
            error instanceof Error ? error.message : "Failed to search",
          );
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300),
    [],
  );

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  useEffect(() => {
    const shouldAnimate = isAssetsLoading || isSearching;
    if (!shouldAnimate) {
      setLoadingDots("");
      return;
    }
    const interval = setInterval(() => {
      setLoadingDots((prev) => (prev === "..." ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isAssetsLoading, isSearching]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(true);
    debouncedSearch(query);
  };

  const displayedAssets = searchQuery.trim() ? searchResults : availableAssets;
  const isLoadingAssets = searchQuery.trim() ? isSearching : isAssetsLoading;
  const currentError = searchQuery.trim() ? searchError : assetsError;

  return {
    searchQuery,
    handleSearchChange,
    displayedAssets,
    isLoadingAssets,
    error: currentError,
    loadingDots,
  };
}
