// src/store/walletStore.ts
import { create } from 'zustand';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  connectWallet: () => void; // Placeholder function type
  disconnectWallet: () => void; // Placeholder function type
  setAddress: (address: string | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  isConnected: false,
  address: null,
  // Placeholder implementations - these will later interact with Laser Eyes
  connectWallet: () => set({ isConnected: true }), // Dummy implementation
  disconnectWallet: () => set({ isConnected: false, address: null }), // Dummy implementation
  setAddress: (address) => set({ address: address }),
})); 