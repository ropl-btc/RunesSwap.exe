'use client';

import { LaserEyesProvider, MAINNET, useLaserEyes } from '@omnisat/lasereyes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { BackgroundProvider } from '@/context/BackgroundContext';
import { LaserEyesContext } from '@/context/LaserEyesContext';

function SharedLaserEyesProvider({ children }: { children: React.ReactNode }) {
  const laserEyesData = useLaserEyes();

  return (
    <LaserEyesContext.Provider value={laserEyesData}>
      {children}
    </LaserEyesContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // This ensures we create only a single instance of the QueryClient
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 60 * 60 * 1000, // 1 hour
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      }),
  );

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render a fallback structure during SSR to prevent hydration mismatch
  if (!isClient) {
    return (
      <LaserEyesProvider config={{ network: MAINNET }}>
        <SharedLaserEyesProvider>
          <QueryClientProvider client={queryClient}>
            <BackgroundProvider>
              <div style={{ visibility: 'hidden' }}>{children}</div>
            </BackgroundProvider>
          </QueryClientProvider>
        </SharedLaserEyesProvider>
      </LaserEyesProvider>
    );
  }

  return (
    <LaserEyesProvider config={{ network: MAINNET }}>
      <SharedLaserEyesProvider>
        <QueryClientProvider client={queryClient}>
          <BackgroundProvider>{children}</BackgroundProvider>
        </QueryClientProvider>
      </SharedLaserEyesProvider>
    </LaserEyesProvider>
  );
}
