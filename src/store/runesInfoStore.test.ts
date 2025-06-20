import type { RuneInfo } from '@/types/ordiscan';
import { useRunesInfoStore } from './runesInfoStore';

describe('runesInfoStore', () => {
  it('updates selected rune info', () => {
    const info: RuneInfo = {
      id: 'test-id',
      name: 'BTC',
      formatted_name: 'BTC',
      number: 1,
      inscription_id: null,
      decimals: 8,
      symbol: null,
      etching_txid: null,
      timestamp_unix: null,
      premined_supply: '0',
      amount_per_mint: null,
      mint_count_cap: null,
      mint_start_block: null,
      mint_end_block: null,
    };
    useRunesInfoStore.getState().setSelectedRuneInfo(info);
    expect(useRunesInfoStore.getState().selectedRuneInfo).toBe(info);
  });

  it('updates search query', () => {
    useRunesInfoStore.getState().setRuneSearchQuery('test');
    expect(useRunesInfoStore.getState().runeSearchQuery).toBe('test');
  });
});
