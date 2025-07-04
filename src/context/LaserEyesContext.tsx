'use client';

import type { ProviderType } from '@omnisat/lasereyes'; // Import ProviderType
import { createContext, useContext } from 'react';
// REMOVED: import type { LaserEyesData } from '@omnisat/lasereyes'; // Assuming LaserEyes exports a type for its hook return value

// Define the shape of the context data based on current usage
interface ILaserEyesContext {
  connected: boolean;
  isConnecting: boolean;
  address: string | null;
  paymentAddress: string | null;
  publicKey: string | null;
  paymentPublicKey: string | null;
  provider?: string; // Keep this as string for display?
  connect: (providerName: ProviderType) => Promise<void>; // Use ProviderType
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
  // Add signMessage function for Liquidium API authentication
  signMessage?: (message: string, address?: string) => Promise<string>;
  // Wallet availability properties
  hasUnisat?: boolean;
  // Add other properties/methods from LaserEyesData if needed later
}

// Create the context with a default value (or null/undefined)
const LaserEyesContext = createContext<ILaserEyesContext | null>(null);

// Custom hook to use the LaserEyes context
export const useSharedLaserEyes = () => {
  const context = useContext(LaserEyesContext);
  if (!context) {
    throw new Error(
      'useSharedLaserEyes must be used within a LaserEyesProvider via SharedLaserEyesProvider',
    );
  }
  return context;
};

// Export the context itself if needed, and the Provider component wrapper
export { LaserEyesContext };
