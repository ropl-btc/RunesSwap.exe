import { create } from 'zustand';
import { type RuneInfo as OrdiscanRuneInfo } from '@/types/ordiscan';

interface RunesInfoState {
  selectedRuneInfo: OrdiscanRuneInfo | null;
  runeSearchQuery: string;
  setSelectedRuneInfo: (runeInfo: OrdiscanRuneInfo | null) => void;
  setRuneSearchQuery: (query: string) => void;
}

export const useRunesInfoStore = create<RunesInfoState>((set) => ({
  selectedRuneInfo: null,
  runeSearchQuery: '',
  setSelectedRuneInfo: (runeInfo) => set({ selectedRuneInfo: runeInfo }),
  setRuneSearchQuery: (query) => set({ runeSearchQuery: query }),
})); 