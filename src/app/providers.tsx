'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LaserEyesProvider, MAINNET, useLaserEyes } from '@omnisat/lasereyes';
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
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes 
        gcTime: 60 * 60 * 1000, // 1 hour
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  }));
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <LaserEyesProvider config={{ network: MAINNET }}>
      <SharedLaserEyesProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SharedLaserEyesProvider>
    </LaserEyesProvider>
  );
} 