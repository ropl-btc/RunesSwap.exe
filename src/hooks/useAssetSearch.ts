import { useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";
import { fetchRunesFromApi } from "@/lib/api";
import { Asset } from "@/types/common";
import type { Rune } from "@/types/satsTerminal";

interface UseAssetSearchArgs {
  availableAssets: Asset[];
  isAssetsLoading?: boolean;
  assetsError?: string | null;
}

export function useAssetSearch({
  availableAssets,
  isAssetsLoading = false,
  assetsError = null,
}: UseAssetSearchArgs) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
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
          const mapped: Asset[] = results.map((rune) => ({
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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const displayedAssets = searchQuery.trim() ? searchResults : availableAssets;
  const isLoadingAssets = searchQuery.trim() ? isSearching : isAssetsLoading;
  const currentError = searchQuery.trim() ? searchError : assetsError;

  return {
    searchQuery,
    handleSearchChange,
    displayedAssets,
    isLoadingAssets,
    currentError,
  };
}

export default useAssetSearch;
