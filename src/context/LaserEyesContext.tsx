'use client';

import { createContext, useContext } from 'react';
import type { ProviderType } from '@omnisat/lasereyes'; // Import ProviderType
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
  signPsbt: (tx: string, finalize?: boolean, broadcast?: boolean) => Promise<{ 
    signedPsbtHex?: string;
    signedPsbtBase64?: string;
    txId?: string;
   } | undefined>;
  // Add other properties/methods from LaserEyesData if needed later
}

// Create the context with a default value (or null/undefined)
const LaserEyesContext = createContext<ILaserEyesContext | null>(null);

// Custom hook to use the LaserEyes context
export const useSharedLaserEyes = () => {
  const context = useContext(LaserEyesContext);
  if (!context) {
    throw new Error('useSharedLaserEyes must be used within a LaserEyesProvider via SharedLaserEyesProvider');
  }
  return context;
};

// Export the context itself if needed, and the Provider component wrapper
export { LaserEyesContext }; 