import { useEffect, useRef, useState } from 'react';
import { fetchPopularFromApi, fetchRunesFromApi } from '@/lib/api';
import { Asset, BTC_ASSET } from '@/types/common';
import { normalizeRuneName } from '@/utils/runeUtils';
import { safeArrayFirst } from '@/utils/typeGuards';

interface UseSwapRunesArgs {
  cachedPopularRunes?: Record<string, unknown>[];
  isPopularRunesLoading?: boolean;
  popularRunesError?: Error | null;
  preSelectedRune?: string | null;
  assetOut: Asset | null;
  setAssetIn: React.Dispatch<React.SetStateAction<Asset>>;
  setAssetOut: React.Dispatch<React.SetStateAction<Asset | null>>;
}

export function useSwapRunes({
  cachedPopularRunes = [],
  isPopularRunesLoading = false,
  popularRunesError = null,
  preSelectedRune = null,
  assetOut,
  setAssetIn,
  setAssetOut,
}: UseSwapRunesArgs) {
  const [popularRunes, setPopularRunes] = useState<Asset[]>([]);
  const [isPopularLoading, setIsPopularLoading] = useState(
    isPopularRunesLoading,
  );
  const [popularError, setPopularError] = useState<string | null>(
    popularRunesError ? popularRunesError.message : null,
  );
  const [isPreselectedRuneLoading, setIsPreselectedRuneLoading] =
    useState(!!preSelectedRune);
  const [hasLoadedPreselectedRune, setHasLoadedPreselectedRune] =
    useState(false);
  const hasLoadedPopularRunes = useRef(false);

  useEffect(() => {
    const fetchPopular = async () => {
      if (hasLoadedPopularRunes.current) return;

      if (cachedPopularRunes && cachedPopularRunes.length > 0) {
        const liquidiumToken: Asset = {
          id: 'liquidiumtoken',
          name: 'LIQUIDIUM•TOKEN',
          imageURI: 'https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN',
          isBTC: false,
        };

        const fetchedRunes: Asset[] = cachedPopularRunes
          .map((collection: Record<string, unknown>) => {
            const runeName =
              ((collection?.etching as Record<string, unknown>)
                ?.runeName as string) ||
              (collection?.rune as string) ||
              'Unknown';
            return {
              id: (collection?.rune as string) || `unknown_${Math.random()}`,
              name: runeName,
              imageURI:
                (collection?.icon_content_url_data as string) ||
                (collection?.imageURI as string),
              isBTC: false,
            };
          })
          .filter(
            (rune) =>
              rune.id !== liquidiumToken.id &&
              normalizeRuneName(rune.name) !==
                normalizeRuneName(liquidiumToken.name),
          );

        const mappedRunes = preSelectedRune
          ? fetchedRunes
          : [liquidiumToken, ...fetchedRunes];
        setPopularRunes(mappedRunes);

        if (!preSelectedRune && !assetOut && mappedRunes.length > 0) {
          const firstRune = safeArrayFirst(mappedRunes);
          if (firstRune) {
            setAssetOut(firstRune);
          }
        }

        setIsPopularLoading(false);
        hasLoadedPopularRunes.current = true;
        return;
      }

      setIsPopularLoading(true);
      setPopularError(null);
      setPopularRunes([]);
      try {
        const liquidiumToken: Asset = {
          id: 'liquidiumtoken',
          name: 'LIQUIDIUM•TOKEN',
          imageURI: 'https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN',
          isBTC: false,
        };

        const response = await fetchPopularFromApi();
        let mappedRunes: Asset[] = [];

        if (!Array.isArray(response)) {
          mappedRunes = [liquidiumToken];
        } else {
          const fetchedRunes: Asset[] = response
            .map((collection: Record<string, unknown>) => ({
              id: (collection?.rune as string) || `unknown_${Math.random()}`,
              name:
                ((collection?.etching as Record<string, unknown>)
                  ?.runeName as string) ||
                (collection?.rune as string) ||
                'Unknown',
              imageURI:
                (collection?.icon_content_url_data as string) ||
                (collection?.imageURI as string),
              isBTC: false,
            }))
            .filter(
              (rune) =>
                rune.id !== liquidiumToken.id &&
                normalizeRuneName(rune.name) !==
                  normalizeRuneName(liquidiumToken.name),
            );

          mappedRunes = [liquidiumToken, ...fetchedRunes];
        }

        setPopularRunes(mappedRunes);
        if (!preSelectedRune && !assetOut && mappedRunes.length > 0) {
          const firstRune = safeArrayFirst(mappedRunes);
          if (firstRune) {
            setAssetOut(firstRune);
          }
        }
      } catch (error) {
        setPopularError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch popular runes',
        );
        const fallback: Asset = {
          id: 'liquidiumtoken',
          name: 'LIQUIDIUM•TOKEN',
          imageURI: 'https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN',
          isBTC: false,
        };
        setPopularRunes(preSelectedRune ? [] : [fallback]);
        if (!preSelectedRune && !assetOut) {
          setAssetOut(fallback);
        }
      } finally {
        setIsPopularLoading(false);
        hasLoadedPopularRunes.current = true;
      }
    };
    fetchPopular();
  }, [cachedPopularRunes, preSelectedRune]);

  useEffect(() => {
    const findAndSelectRune = async () => {
      if (preSelectedRune && !hasLoadedPreselectedRune) {
        setIsPreselectedRuneLoading(true);
        const normalized = normalizeRuneName(preSelectedRune);
        const rune = popularRunes.find(
          (r) => normalizeRuneName(r.name) === normalized,
        );

        if (rune) {
          setAssetIn(BTC_ASSET);
          setAssetOut(rune);
          setIsPreselectedRuneLoading(false);
          setHasLoadedPreselectedRune(true);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('rune');
            window.history.replaceState({}, '', url.toString());
          }
        } else {
          try {
            const searchResults = await fetchRunesFromApi(preSelectedRune);
            if (searchResults && searchResults.length > 0) {
              const matchingRune = searchResults.find(
                (r) => normalizeRuneName(r.name) === normalized,
              );
              const foundRune = matchingRune || safeArrayFirst(searchResults);
              if (foundRune) {
                const foundAsset: Asset = {
                  id: foundRune.id,
                  name: foundRune.name,
                  imageURI: foundRune.imageURI,
                  isBTC: false,
                };
                setAssetIn(BTC_ASSET);
                setAssetOut(foundAsset);
              }
            }
          } catch {
            // ignore
          } finally {
            setIsPreselectedRuneLoading(false);
            setHasLoadedPreselectedRune(true);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('rune');
              window.history.replaceState({}, '', url.toString());
            }
          }
        }
      } else if (!preSelectedRune) {
        setIsPreselectedRuneLoading(false);
        setHasLoadedPreselectedRune(false);
      }
    };

    findAndSelectRune();
  }, [preSelectedRune, popularRunes, hasLoadedPreselectedRune]);

  return {
    popularRunes,
    isPopularLoading,
    popularError,
    isPreselectedRuneLoading,
  };
}

export default useSwapRunes;
