'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { FormattedRuneAmount } from './FormattedRuneAmount';
import styles from './PortfolioTab.module.css';

interface FormattedLiquidiumCollateralProps {
  runeId: string;
  runeAmount: number;
  runeDivisibility: number;
}

export function FormattedLiquidiumCollateral({
  runeId,
  runeAmount,
  runeDivisibility
}: FormattedLiquidiumCollateralProps) {
  const [runeName, setRuneName] = useState<string | null>(null);
  const [formattedRuneName, setFormattedRuneName] = useState<string | null>(null);
  const [runeIdForQuery, setRuneIdForQuery] = useState<string | null>(null);

  // Use the full rune_id for querying
  useEffect(() => {
    if (runeId) {
      // Log the rune_id for debugging
      console.log(`[FormattedLiquidiumCollateral] Looking up rune with ID: ${runeId}`);
      setRuneIdForQuery(runeId);
    }
  }, [runeId]);

  // Fetch rune info to get the actual rune name
  const {
    data: runeInfo
  } = useQuery({
    queryKey: ['runeInfoById', runeIdForQuery],
    queryFn: async () => {
      // Try to fetch by the full rune_id
      if (runeIdForQuery) {
        try {
          // We'll try to find a rune with this ID in our database
          console.log(`[FormattedLiquidiumCollateral] Fetching rune info for ID: ${runeIdForQuery}`);
          const response = await fetch(`/api/ordiscan/rune-info-by-id?prefix=${encodeURIComponent(runeIdForQuery)}`);
          if (response.ok) {
            const data = await response.json();
            if (data) {
              console.log(`[FormattedLiquidiumCollateral] Received rune data:`, data);
              return data;
            }
          }
        } catch (error) {
          console.error('Error fetching rune by ID:', error);
        }
      }
      return null;
    },
    enabled: !!runeIdForQuery,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Update state when runeInfo changes
  useEffect(() => {
    if (runeInfo) {
      if (runeInfo.name) {
        setRuneName(runeInfo.name);
      }
      if (runeInfo.formatted_name) {
        console.log(`[FormattedLiquidiumCollateral] Using formatted_name: ${runeInfo.formatted_name}`);
        setFormattedRuneName(runeInfo.formatted_name);
      } else if (runeInfo.name) {
        setFormattedRuneName(runeInfo.name);
      }
    }
  }, [runeInfo]);

  // Format the amount based on divisibility
  const formattedAmount = (amount: number, divisibility: number): string => {
    if (divisibility === 0) {
      return amount.toLocaleString();
    }

    const factor = Math.pow(10, divisibility);
    const formattedValue = (amount / factor).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: divisibility
    });

    return formattedValue;
  };

  // If we have a rune name, use FormattedRuneAmount
  if (runeName) {
    const displayName = formattedRuneName || runeName;

    return (
      <div className={styles.collateralContainer}>
        {runeInfo?.imageURI && (
          <Image
            src={runeInfo.imageURI}
            alt=""
            className={styles.runeImage}
            width={20}
            height={20}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target) {
                target.style.display = 'none';
              }
            }}
          />
        )}
        <div className={styles.collateralDetails}>
          <div className={styles.collateralAmount}>
            <FormattedRuneAmount
              runeName={runeName}
              rawAmount={String(runeAmount)}
            />
          </div>
          <div className={styles.collateralName}>
            {displayName}
          </div>
        </div>
      </div>
    );
  }

  // If we don't have a rune name yet, show the raw amount with the rune ID
  return (
    <div className={styles.collateralDetails}>
      <div className={styles.collateralAmount}>
        {formattedAmount(runeAmount, runeDivisibility)}
      </div>
      <div className={styles.collateralName}>
        {runeId}
      </div>
    </div>
  );
}
