import { act, renderHook, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { RuneData } from '@/lib/runesData';
import useBorrowQuotes from './useBorrowQuotes';

jest.mock('@/lib/apiClient', () => ({
  fetchBorrowQuotesFromApi: jest.fn(),
  fetchBorrowRangesFromApi: jest.fn(),
  fetchPopularFromApi: jest.fn(),
}));

const {
  fetchBorrowQuotesFromApi,
  fetchBorrowRangesFromApi,
  fetchPopularFromApi,
} = jest.requireMock('@/lib/apiClient');

beforeAll(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  (global as unknown as { window: Window }).window =
    dom.window as unknown as Window;
  (global as unknown as { document: Document }).document = dom.window.document;
});

afterAll(() => {
  (
    global as unknown as { window: Window & { close: () => void } }
  ).window.close();
});

type HookProps = Parameters<typeof useBorrowQuotes>[0];

function baseProps(overrides: Partial<HookProps> = {}): HookProps {
  return {
    collateralAsset: null,
    collateralAmount: '',
    address: null,
    collateralRuneInfo: null,
    ...overrides,
  };
}

describe('useBorrowQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads popular runes on mount', async () => {
    (fetchPopularFromApi as jest.Mock).mockResolvedValue([
      { rune_id: 'AAA', slug: 'AAA', icon_content_url_data: 'a.png' },
    ]);

    const { result } = renderHook(
      (props: HookProps) => useBorrowQuotes(props),
      {
        initialProps: baseProps(),
      },
    );

    await waitFor(() => expect(result.current.isPopularLoading).toBe(false));
    expect(fetchPopularFromApi).toHaveBeenCalled();
    expect(result.current.popularRunes.map((r) => r.id)).toEqual([
      'liquidiumtoken',
      'AAA',
    ]);
  });

  it('updates borrow range when collateral changes', async () => {
    (fetchPopularFromApi as jest.Mock).mockResolvedValue([]);
    (fetchBorrowRangesFromApi as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        runeId: 'AAA',
        minAmount: '100',
        maxAmount: '1000',
        cached: false,
        updatedAt: '',
      },
    });

    const asset = { id: 'AAA', name: 'AAA', imageURI: 'a.png', isBTC: false };
    const runeInfo = { id: 'AAA', name: 'AAA', decimals: 2 } as RuneData;

    const { result, rerender } = renderHook(
      (props: HookProps) => useBorrowQuotes(props),
      {
        initialProps: baseProps(),
      },
    );

    rerender(
      baseProps({
        collateralAsset: asset,
        address: 'addr',
        collateralRuneInfo: runeInfo,
      }),
    );

    await waitFor(() =>
      expect(result.current.minMaxRange).toBe('Min: 1.00 - Max: 10.00'),
    );
    expect(fetchBorrowRangesFromApi).toHaveBeenCalledWith('AAA', 'addr');
    expect(result.current.borrowRangeError).toBeNull();
  });

  it('retrieves quotes successfully', async () => {
    (fetchPopularFromApi as jest.Mock).mockResolvedValue([]);
    (fetchBorrowQuotesFromApi as jest.Mock).mockResolvedValue({
      success: true,
      runeDetails: {
        valid_ranges: {
          rune_amount: { ranges: [{ min: '200', max: '2000' }] },
          loan_term_days: [7],
        },
        offers: [
          {
            offer_id: '1',
            fungible_amount: 1,
            loan_term_days: 7,
            ltv_rate: 80,
            loan_breakdown: {
              total_repayment_sats: 1000,
              principal_sats: 900,
              interest_sats: 100,
              loan_due_by_date: '',
              activation_fee_sats: 0,
              discount: { discount_rate: 0, discount_sats: 0 },
            },
          },
        ],
      },
    });

    const asset = { id: 'AAA', name: 'AAA', imageURI: 'a.png', isBTC: false };
    const runeInfo = { id: 'AAA', name: 'AAA', decimals: 2 } as RuneData;

    const { result } = renderHook(
      (props: HookProps) => useBorrowQuotes(props),
      {
        initialProps: baseProps({
          collateralAsset: asset,
          collateralAmount: '2',
          address: 'addr',
          collateralRuneInfo: runeInfo,
        }),
      },
    );

    await act(async () => {
      await result.current.handleGetQuotes();
    });

    await waitFor(() => expect(result.current.isQuotesLoading).toBe(false));
    expect(fetchBorrowQuotesFromApi).toHaveBeenCalledWith('AAA', '200', 'addr');
    expect(result.current.quotes.length).toBe(1);
    expect(result.current.minMaxRange).toBe('Min: 2.00 - Max: 20.00');
    expect(result.current.quotesError).toBeNull();
  });

  it('handles quote API errors', async () => {
    (fetchPopularFromApi as jest.Mock).mockResolvedValue([]);
    (fetchBorrowQuotesFromApi as jest.Mock).mockRejectedValue(
      new Error('fail'),
    );

    const asset = { id: 'AAA', name: 'AAA', imageURI: 'a.png', isBTC: false };
    const runeInfo = { id: 'AAA', name: 'AAA', decimals: 2 } as RuneData;

    const { result } = renderHook(
      (props: HookProps) => useBorrowQuotes(props),
      {
        initialProps: baseProps({
          collateralAsset: asset,
          collateralAmount: '2',
          address: 'addr',
          collateralRuneInfo: runeInfo,
        }),
      },
    );

    await act(async () => {
      await result.current.handleGetQuotes();
    });

    await waitFor(() => expect(result.current.isQuotesLoading).toBe(false));
    expect(result.current.quotes).toEqual([]);
    expect(result.current.quotesError).toBe('fail');
    expect(result.current.minMaxRange).toBeNull();
  });
});
