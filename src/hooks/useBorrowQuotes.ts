import { useEffect, useState } from 'react';
import {
  LiquidiumBorrowQuoteOffer,
  LiquidiumBorrowQuoteResponse,
  fetchBorrowQuotesFromApi,
  fetchBorrowRangesFromApi,
  fetchPopularFromApi,
} from '@/lib/apiClient';
import type { RuneData } from '@/lib/runesData';
import { Asset } from '@/types/common';
import { normalizeRuneName } from '@/utils/runeUtils';
import { safeArrayAccess, safeArrayFirst } from '@/utils/typeGuards';

interface UseBorrowQuotesArgs {
  collateralAsset: Asset | null;
  collateralAmount: string;
  address: string | null;
  collateralRuneInfo: RuneData | null;
}

export function useBorrowQuotes({
  collateralAsset,
  collateralAmount,
  address,
  collateralRuneInfo,
}: UseBorrowQuotesArgs) {
  const [popularRunes, setPopularRunes] = useState<Asset[]>([]);
  const [isPopularLoading, setIsPopularLoading] = useState(false);
  const [popularError, setPopularError] = useState<string | null>(null);

  const [quotes, setQuotes] = useState<LiquidiumBorrowQuoteOffer[]>([]);
  const [isQuotesLoading, setIsQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [minMaxRange, setMinMaxRange] = useState<string | null>(null);
  const [borrowRangeError, setBorrowRangeError] = useState<string | null>(null);

  // Fetch popular runes on mount
  useEffect(() => {
    const fetchPopular = async () => {
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
              id: (collection?.rune_id as string) || `unknown_${Math.random()}`,
              name: (
                (collection?.slug as string) ||
                (collection?.rune as string) ||
                'Unknown'
              ).replace(/-/g, '•'),
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
        setPopularRunes([fallback]);
      } finally {
        setIsPopularLoading(false);
      }
    };
    fetchPopular();
  }, []);

  // Fetch min-max borrow range when collateral asset changes
  useEffect(() => {
    const fetchMinMaxRange = async () => {
      if (
        !collateralAsset ||
        !address ||
        collateralAsset.isBTC ||
        !collateralRuneInfo
      ) {
        setMinMaxRange(null);
        setBorrowRangeError(null);
        return;
      }
      try {
        let runeIdForApi = collateralAsset.id;
        if (collateralRuneInfo?.id?.includes(':')) {
          runeIdForApi = collateralRuneInfo.id;
        }
        const result = await fetchBorrowRangesFromApi(runeIdForApi, address);
        if (result.success && result.data) {
          const { minAmount, maxAmount } = result.data;
          const decimals = collateralRuneInfo?.decimals ?? 0;
          const minFormatted = formatRuneAmount(minAmount, decimals);
          const maxFormatted = formatRuneAmount(maxAmount, decimals);
          setMinMaxRange(`Min: ${minFormatted} - Max: ${maxFormatted}`);
          setBorrowRangeError(null);
        } else {
          setMinMaxRange(null);
          setBorrowRangeError(null);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setMinMaxRange(null);
        if (
          errorMessage.includes('No valid ranges found') ||
          errorMessage.includes(
            'Could not find valid borrow ranges for this rune',
          )
        ) {
          setBorrowRangeError(
            'This rune is not currently available for borrowing on Liquidium.',
          );
        } else {
          setBorrowRangeError(null);
        }
      }
    };
    fetchMinMaxRange();
  }, [collateralAsset, address, collateralRuneInfo]);

  const formatRuneAmount = (rawAmount: string, decimals: number): string => {
    try {
      const rawAmountBigInt = BigInt(rawAmount);
      const divisorBigInt = BigInt(10 ** decimals);
      const scaledAmount = (rawAmountBigInt * BigInt(100)) / divisorBigInt;
      const scaledNumber = Number(scaledAmount) / 100;
      return scaledNumber.toFixed(decimals > 0 ? 2 : 0);
    } catch {
      return (Number(rawAmount) / 10 ** decimals).toFixed(decimals > 0 ? 2 : 0);
    }
  };

  const resetQuotes = () => {
    setQuotes([]);
    setSelectedQuoteId(null);
    setQuotesError(null);
  };

  const handleGetQuotes = async () => {
    if (!collateralAsset || !collateralAmount || !address) return;

    // Validate collateral amount before proceeding
    const amountFloat = parseFloat(collateralAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setQuotesError('Please enter a valid collateral amount.');
      return;
    }

    setIsQuotesLoading(true);
    resetQuotes();
    try {
      const decimals = collateralRuneInfo?.decimals ?? 0;
      let rawAmount: string;
      try {
        // Fix floating point precision issues by using string manipulation
        // for high precision decimal conversions
        if (decimals > 8) {
          // For high decimals, use string-based conversion to avoid precision loss
          // Trim whitespace to ensure consistency with parseFloat validation
          const amountStr = collateralAmount.trim();
          const [integerPart = '0', decimalPart = ''] = amountStr.split('.');

          // Truncate decimal part to supported precision, then pad to required length
          const truncatedDecimal = decimalPart.slice(0, decimals);
          const paddedDecimal = truncatedDecimal.padEnd(decimals, '0');

          // Combine integer and decimal parts
          const fullAmountStr = integerPart + paddedDecimal;

          // Remove leading zeros and convert to BigInt
          rawAmount = BigInt(
            fullAmountStr.replace(/^0+/, '') || '0',
          ).toString();
        } else {
          // For lower decimals, use the original method but with better precision handling
          const amountInteger = Math.floor(
            amountFloat * 10 ** Math.min(8, decimals),
          );
          const multiplier = BigInt(10 ** Math.max(0, decimals - 8));
          const amountBigInt = BigInt(amountInteger) * multiplier;
          rawAmount = amountBigInt.toString();
        }
      } catch {
        rawAmount = String(Math.floor(amountFloat * 10 ** decimals));
      }

      let runeIdForApi = collateralAsset.id;
      if (collateralRuneInfo?.id?.includes(':')) {
        runeIdForApi = collateralRuneInfo.id;
      }

      const result: LiquidiumBorrowQuoteResponse =
        await fetchBorrowQuotesFromApi(runeIdForApi, rawAmount, address);

      if (result?.runeDetails) {
        if (result.runeDetails.valid_ranges?.rune_amount?.ranges?.length > 0) {
          const ranges = result.runeDetails.valid_ranges.rune_amount.ranges;
          const firstRange = safeArrayFirst(ranges);
          if (firstRange) {
            let globalMin = BigInt(firstRange.min);
            let globalMax = BigInt(firstRange.max);
            for (let i = 1; i < ranges.length; i++) {
              const currentRange = safeArrayAccess(ranges, i);
              if (currentRange) {
                const currentMin = BigInt(currentRange.min);
                const currentMax = BigInt(currentRange.max);
                if (currentMin < globalMin) globalMin = currentMin;
                if (currentMax > globalMax) globalMax = currentMax;
              }
            }
            const minFormatted = formatRuneAmount(
              globalMin.toString(),
              decimals,
            );
            const maxFormatted = formatRuneAmount(
              globalMax.toString(),
              decimals,
            );
            setMinMaxRange(`Min: ${minFormatted} - Max: ${maxFormatted}`);
          }
        } else {
          setMinMaxRange(null);
        }

        if (result.runeDetails.offers) {
          setQuotes(result.runeDetails.offers);
          if (result.runeDetails.offers.length === 0) {
            setQuotesError('No loan offers available for this amount.');
          }
        } else {
          setQuotes([]);
          setQuotesError('No loan offers found or invalid response.');
        }
      } else {
        setQuotes([]);
        setQuotesError('No loan offers found or invalid response.');
        setMinMaxRange(null);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch quotes.';
      setQuotesError(errorMessage);
      setQuotes([]);
      setMinMaxRange(null);
    } finally {
      setIsQuotesLoading(false);
    }
  };

  return {
    popularRunes,
    isPopularLoading,
    popularError,
    quotes,
    isQuotesLoading,
    quotesError,
    selectedQuoteId,
    setSelectedQuoteId,
    minMaxRange,
    borrowRangeError,
    resetQuotes,
    handleGetQuotes,
  };
}

export default useBorrowQuotes;
