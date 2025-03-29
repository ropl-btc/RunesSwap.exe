'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRuneInfo, type RuneInfo } from '@/lib/ordiscan';

interface FormattedRuneAmountProps {
  runeName: string | null | undefined;
  rawAmount: string | null | undefined;
}

export function FormattedRuneAmount({ runeName, rawAmount }: FormattedRuneAmountProps) {
  const {
    data: runeInfo,
    isLoading,
    error,
  } = useQuery<RuneInfo | null, Error>({
    // Use uppercase name consistent with other queries, handle potential null/undefined
    queryKey: ['runeInfo', (runeName || '').toUpperCase()],
    queryFn: () => (runeName ? getRuneInfo(runeName) : Promise.resolve(null)),
    enabled: !!runeName && rawAmount !== 'N/A' && rawAmount !== null && rawAmount !== undefined, // Only run if we have a rune name and a valid raw amount
    staleTime: Infinity, // Decimals rarely change, cache indefinitely
    retry: (failureCount, fetchError: unknown) => {
       // Don't retry if rune is not found (404)
       let is404 = false;
       if (fetchError instanceof Error && fetchError.message && fetchError.message.includes('404')) {
         is404 = true;
       } else if (fetchError && typeof fetchError === 'object' && 'status' in fetchError && (fetchError as { status: number }).status === 404) {
         is404 = true;
       }
       return !is404 && failureCount < 2; // Retry other errors twice
    }
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
      // Optionally check if it was a 404 error vs other errors
      let is404 = false;
      if (error instanceof Error && error.message && error.message.includes('404')) {
          is404 = true;
      }
      // Display raw amount if rune info wasn't found, otherwise show generic error
      return <span>{rawAmount} {is404 ? '(Decimals N/A)' : '(Error fetching decimals)'}</span>;
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
      } catch (e) {
          console.error("Error formatting raw amount (0 decimals):", e);
          return <span>{rawAmount} (Invalid Raw)</span>; // Fallback for invalid rawAmount
      }
  }

  // Calculate and format with decimals
  try {
    // Use BigInt for precision with large numbers before converting to Number for division
    const rawAmountBigInt = BigInt(rawAmount);
    const divisor = BigInt(10 ** decimals);
    
    // Perform division carefully to handle potential floating point issues
    // For display, Number should be sufficient after scaling down
    const formattedAmount = Number(rawAmountBigInt) / Number(divisor);

    if (isNaN(formattedAmount)) {
        throw new Error("Calculated amount is NaN");
    }

    // Format the number with appropriate decimal places
    return <span>{formattedAmount.toLocaleString(undefined, { maximumFractionDigits: decimals })}</span>;
  } catch (e) {
    console.error("Error formatting rune amount:", e);
    return <span>{rawAmount} (Formatting Error)</span>; // Fallback
  }
} 