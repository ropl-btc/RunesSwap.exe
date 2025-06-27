'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { fetchRuneInfoFromApi } from '@/lib/api';
import type { RuneData } from '@/lib/runesData';

interface FormattedRuneAmountProps {
  runeName: string | null | undefined;
  rawAmount: string | null | undefined;
}

export function FormattedRuneAmount({
  runeName,
  rawAmount,
}: FormattedRuneAmountProps) {
  const {
    data: runeInfo,
    isLoading,
    error,
  } = useQuery<RuneData | null, Error>({
    // Update queryKey to reflect API usage
    queryKey: ['runeInfoApi', (runeName || '').toUpperCase()],
    // Use the new API client function
    queryFn: () =>
      runeName ? fetchRuneInfoFromApi(runeName) : Promise.resolve(null),
    enabled:
      !!runeName &&
      rawAmount !== 'N/A' &&
      rawAmount !== null &&
      rawAmount !== undefined, // Only run if we have a rune name and a valid raw amount
    staleTime: Infinity, // Decimals rarely change, cache indefinitely
    // Remove specific 404 retry logic, as API client returns null for 404 (treated as success by useQuery)
    retry: 2, // Retry other network/server errors twice
  });

  if (rawAmount === 'N/A' || rawAmount === null || rawAmount === undefined) {
    return <span>N/A</span>;
  }

  if (!runeName) {
    return <span>{rawAmount} (Unknown Rune)</span>; // Should not happen if enabled logic works
  }

  if (isLoading) {
    return <span>{rawAmount} (Loading decimals...)</span>;
  }

  if (error) {
    // 404 is handled by runeInfo being null, so this only catches other errors
    return <span>{rawAmount} (&apos;Error fetching decimals&apos;)</span>;
  }

  if (!runeInfo || typeof runeInfo.decimals !== 'number') {
    // Rune info loaded but no decimals found (or invalid format), show raw amount
    return <span>{rawAmount} (Decimals N/A)</span>;
  }

  const decimals = runeInfo.decimals;

  // Handle case where decimals are 0
  if (decimals === 0) {
    try {
      // Format even if 0 decimals for consistency (e.g., add commas)
      const amountNum = BigInt(rawAmount); // Use BigInt for potentially large raw amounts
      return <span>{amountNum.toLocaleString()}</span>;
    } catch {
      return <span>{rawAmount} (Invalid Raw)</span>; // Fallback for invalid rawAmount
    }
  }

  // Calculate and format with decimals
  try {
    // Use BigInt for precision with large numbers before converting to Number for division
    const rawAmountBigInt = BigInt(rawAmount);
    // Perform exponentiation entirely with BigInt to avoid precision loss for large decimals
    const divisor = BigInt(10) ** BigInt(decimals);

    // Perform division carefully to handle potential floating point issues
    // For display, Number should be sufficient after scaling down
    const formattedAmount = Number(rawAmountBigInt) / Number(divisor);

    if (isNaN(formattedAmount)) {
      throw new Error('Calculated amount is NaN');
    }

    // Format the number with appropriate decimal places
    return (
      <span>
        {formattedAmount.toLocaleString(undefined, {
          maximumFractionDigits: decimals,
        })}
      </span>
    );
  } catch {
    return <span>{rawAmount} (Formatting Error)</span>; // Fallback
  }
}
