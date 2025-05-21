import { useState, useEffect, useMemo } from "react";
import debounce from "lodash.debounce";
import { fetchRunesFromApi, fetchPopularFromApi } from "@/lib/apiClient";
import type { Rune } from "@/types/satsTerminal";
import { Asset } from "@/types/common";

interface UseAssetSearchResult {
  searchQuery: string;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  availableAssets: Asset[];
  isLoadingAssets: boolean;
  currentError: string | null;
}

export default function useAssetSearch(): UseAssetSearchResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [popularRunes, setPopularRunes] = useState<Asset[]>([]);
  const [isPopularLoading, setIsPopularLoading] = useState(false);
  const [popularError, setPopularError] = useState<string | null>(null);

  // Load popular runes once on mount
  useEffect(() => {
    const loadPopular = async () => {
      setIsPopularLoading(true);
      setPopularError(null);
      try {
        const response = await fetchPopularFromApi();
        if (Array.isArray(response)) {
          const mapped: Asset[] = response.map(
            (collection: Record<string, unknown>) => ({
              id:
                (collection?.rune as string) ||
                (collection?.rune_id as string) ||
                `unknown_${Math.random()}`,
              name:
                ((collection?.etching as Record<string, unknown>)
                  ?.runeName as string) ||
                (collection?.rune as string) ||
                (collection?.slug as string)?.replace(/-/g, "•") ||
                "Unknown",
              imageURI:
                (collection?.icon_content_url_data as string) ||
                (collection?.imageURI as string),
              isBTC: false,
            }),
          );
          setPopularRunes(mapped);
        } else {
          setPopularRunes([]);
        }
      } catch (error) {
        setPopularError(
          error instanceof Error
            ? error.message
            : "Failed to fetch popular runes",
        );
        setPopularRunes([]);
      } finally {
        setIsPopularLoading(false);
      }
    };
    loadPopular();
  }, []);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query) {
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
      }, 300),
    [],
  );

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const displayedAssets = searchQuery.trim() ? searchResults : popularRunes;
  const isLoadingAssets = searchQuery.trim() ? isSearching : isPopularLoading;
  const currentError = searchQuery.trim() ? searchError : popularError;

  return {
    searchQuery,
    handleSearchChange,
    availableAssets: displayedAssets,
    isLoadingAssets,
    currentError,
  };
}
