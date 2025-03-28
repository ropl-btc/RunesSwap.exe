'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LaserEyesProvider, MAINNET } from '@omnisat/lasereyes';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <LaserEyesProvider config={{ network: MAINNET }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </LaserEyesProvider>
  );
} 