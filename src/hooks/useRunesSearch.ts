import { useState, useEffect, useMemo } from "react";
import debounce from "lodash.debounce";
import { fetchRunesFromApi, fetchPopularFromApi } from "@/lib/apiClient";
import { useRunesInfoStore } from "@/store/runesInfoStore";
import type { Rune } from "@/types/satsTerminal";

interface UseRunesSearchOptions {
  cachedPopularRunes?: Record<string, unknown>[];
  isPopularRunesLoading?: boolean;
  popularRunesError?: Error | null;
}

export function useRunesSearch({
  cachedPopularRunes = [],
  isPopularRunesLoading = false,
  popularRunesError = null,
}: UseRunesSearchOptions = {}) {
  const { runeSearchQuery: persistedQuery, setRuneSearchQuery } =
    useRunesInfoStore();

  const [searchQuery, setSearchQuery] = useState(persistedQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Rune[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isPopularLoading, setIsPopularLoading] = useState(
    isPopularRunesLoading,
  );
  const [popularRunes, setPopularRunes] = useState<Rune[]>([]);
  const [popularError, setPopularError] = useState<string | null>(
    popularRunesError ? popularRunesError.message : null,
  );

  useEffect(() => {
    const fetchPopular = async () => {
      if (cachedPopularRunes && cachedPopularRunes.length > 0) {
        const liquidiumToken: Rune = {
          id: "liquidiumtoken",
          name: "LIQUIDIUM•TOKEN",
          imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
        };
        const fetchedRunes: Rune[] = cachedPopularRunes
          .map((collection: Record<string, unknown>) => ({
            id: (collection?.rune as string) || `unknown_${Math.random()}`,
            name:
              ((collection?.etching as Record<string, unknown>)
                ?.runeName as string) ||
              (collection?.rune as string) ||
              "Unknown",
            imageURI:
              (collection?.icon_content_url_data as string) ||
              (collection?.imageURI as string),
          }))
          .filter(
            (rune) =>
              rune.id !== liquidiumToken.id &&
              rune.name !== liquidiumToken.name,
          );
        setPopularRunes([liquidiumToken, ...fetchedRunes]);
        setIsPopularLoading(false);
        return;
      }

      setIsPopularLoading(true);
      setPopularError(null);
      setPopularRunes([]);
      try {
        const liquidiumToken: Rune = {
          id: "liquidiumtoken",
          name: "LIQUIDIUM•TOKEN",
          imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
        };
        const response = await fetchPopularFromApi();
        let mappedRunes: Rune[] = [];
        if (!Array.isArray(response)) {
          mappedRunes = [liquidiumToken];
        } else {
          const fetchedRunes: Rune[] = response
            .map((collection: Record<string, unknown>) => ({
              id: (collection?.rune as string) || `unknown_${Math.random()}`,
              name:
                ((collection?.etching as Record<string, unknown>)
                  ?.runeName as string) ||
                (collection?.rune as string) ||
                "Unknown",
              imageURI:
                (collection?.icon_content_url_data as string) ||
                (collection?.imageURI as string),
            }))
            .filter(
              (rune) =>
                rune.id !== liquidiumToken.id &&
                rune.name !== liquidiumToken.name,
            );
          mappedRunes = [liquidiumToken, ...fetchedRunes];
        }
        setPopularRunes(mappedRunes);
      } catch (error) {
        setPopularError(
          error instanceof Error
            ? error.message
            : "Failed to fetch popular runes",
        );
        const liquidiumTokenOnError: Rune = {
          id: "liquidiumtoken",
          name: "LIQUIDIUM•TOKEN",
          imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
        };
        setPopularRunes([liquidiumTokenOnError]);
      } finally {
        setIsPopularLoading(false);
      }
    };

    fetchPopular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setSearchResults(results);
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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setRuneSearchQuery(query);
    setIsSearching(true);
    debouncedSearch(query);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      if (!searchQuery.trim()) {
        setIsSearchFocused(false);
      }
    }, 200);
  };

  const availableRunes = searchQuery.trim() ? searchResults : popularRunes;
  const isLoadingRunes = searchQuery.trim() ? isSearching : isPopularLoading;
  const currentRunesError = searchQuery.trim() ? searchError : popularError;

  return {
    searchQuery,
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlur,
    isSearchFocused,
    availableRunes,
    isLoadingRunes,
    currentRunesError,
  };
}

export default useRunesSearch;
