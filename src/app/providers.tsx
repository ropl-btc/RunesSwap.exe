'use client';

import { LaserEyesProvider, MAINNET, useLaserEyes } from '@omnisat/lasereyes';
import type { ProviderType } from '@omnisat/lasereyes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { BackgroundProvider } from '@/context/BackgroundContext';
import { LaserEyesContext } from '@/context/LaserEyesContext';

interface LaserEyesStubContext {
  connected: boolean;
  isConnecting: boolean;
  address: string | null;
  paymentAddress: string | null;
  publicKey: string | null;
  paymentPublicKey: string | null;
  connect: (providerName: ProviderType) => Promise<void>;
  disconnect: () => void;
  signPsbt: (
    tx: string,
    finalize?: boolean,
    broadcast?: boolean,
  ) => Promise<
    | {
        signedPsbtHex: string | undefined;
        signedPsbtBase64: string | undefined;
        txId?: string;
      }
    | undefined
  >;
  signMessage?: (message: string, address?: string) => Promise<string>;
  hasUnisat?: boolean;
}

const laserEyesStub: LaserEyesStubContext = {
  connected: false,
  isConnecting: false,
  address: null,
  paymentAddress: null,
  publicKey: null,
  paymentPublicKey: null,

  async connect() {
    /* noop */
  },
  disconnect() {
    /* noop */
  },

  async signPsbt() {
    return undefined;
  },

  async signMessage() {
    return '';
  },
  hasUnisat: false,
};

function SharedLaserEyesProvider({ children }: { children: React.ReactNode }) {
  // useLaserEyes is safe here because this component is only mounted when we
  // are wrapped by a real LaserEyesProvider (after client hydration).
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

  // During SSR/first render we provide a lightweight, inert context so that
  // any downstream components relying on useSharedLaserEyes() do not throw.
  if (!isClient) {
    return (
      <LaserEyesContext.Provider value={laserEyesStub}>
        <QueryClientProvider client={queryClient}>
          <BackgroundProvider>
            {/* children are rendered but **without** wallet functionality */}
            {children}
          </BackgroundProvider>
        </QueryClientProvider>
      </LaserEyesContext.Provider>
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
