'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { fetchRuneInfoFromApi } from '@/lib/api';
import type { RuneData } from '@/lib/runesData';

interface FormattedRuneNameProps {
  runeName: string | null | undefined;
}

export function FormattedRuneName({ runeName }: FormattedRuneNameProps) {
  // Use React Query to fetch rune info
  const { data: runeInfo } = useQuery<RuneData | null, Error>({
    queryKey: ['runeInfoApi', (runeName || '').toUpperCase()],
    queryFn: () =>
      runeName ? fetchRuneInfoFromApi(runeName) : Promise.resolve(null),
    enabled: !!runeName && runeName !== 'N/A',
    staleTime: Infinity, // Names rarely change, cache indefinitely
    retry: 1, // Minimal retry to reduce network load
  });

  // Handle invalid rune names
  if (!runeName || runeName === 'N/A') {
    return <span>N/A</span>;
  }

  // Show formatted name if available, otherwise fall back to regular name
  return <span>{runeInfo?.formatted_name || runeName}</span>;
}
