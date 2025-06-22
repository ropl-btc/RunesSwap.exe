import {
  type BorrowRangeResponse,
  type LiquidiumBorrowQuoteResponse,
  type LiquidiumPrepareBorrowResponse,
  type LiquidiumSubmitBorrowResponse,
  type RepayLiquidiumLoanResponse,
  type SubmitRepayResponse,
  fetchBorrowQuotesFromApi,
  fetchBorrowRangesFromApi,
  prepareLiquidiumBorrow,
  repayLiquidiumLoan,
  submitLiquidiumBorrow,
  submitRepayPsbt,
} from './liquidium';

// Mock the global fetch function
global.fetch = jest.fn();

// Helper to mock fetch responses
const mockFetchResponse = (data: unknown, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : status === 404 ? 'Not Found' : 'Server Error',
    json: () => Promise.resolve(data),
  } as Response);

// Helper to mock fetch JSON parse failure
const mockFetchJsonError = (ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.reject(new Error('Invalid JSON')),
  } as Response);

describe('liquidium API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchBorrowQuotesFromApi', () => {
    const mockQuoteResponse: LiquidiumBorrowQuoteResponse = {
      success: true,
      runeDetails: {
        rune_id: 'test-rune-id',
        slug: 'test-rune',
        floor_price_sats: 1000,
        floor_price_last_updated_at: '2024-01-01T00:00:00Z',
        common_offer_data: {
          interest_rate: 10,
          rune_divisibility: 8,
        },
        valid_ranges: {
          rune_amount: { ranges: [{ min: '100', max: '1000' }] },
          loan_term_days: [30, 60, 90],
        },
        offers: [
          {
            offer_id: 'offer-123',
            fungible_amount: 1,
            loan_term_days: 30,
            ltv_rate: 80,
            loan_breakdown: {
              total_repayment_sats: 1100,
              principal_sats: 1000,
              interest_sats: 100,
              loan_due_by_date: '2024-02-01T00:00:00Z',
              activation_fee_sats: 50,
              discount: {
                discount_rate: 5,
                discount_sats: 50,
              },
            },
          },
        ],
      },
    };

    it('fetches borrow quotes successfully', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockQuoteResponse),
      );

      const result = await fetchBorrowQuotesFromApi(
        'test-rune-id',
        '500',
        'bc1test123',
      );

      expect(fetch).toHaveBeenCalledWith(
        '/api/liquidium/borrow/quotes?runeId=test-rune-id&runeAmount=500&address=bc1test123',
      );
      expect(result).toEqual(mockQuoteResponse);
    });

    it('handles nested data structure response', async () => {
      const nestedResponse = {
        success: true,
        data: {
          runeDetails: mockQuoteResponse.runeDetails,
        },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(nestedResponse),
      );

      const result = await fetchBorrowQuotesFromApi(
        'test-rune-id',
        '500',
        'bc1test123',
      );

      expect(result.runeDetails).toEqual(mockQuoteResponse.runeDetails);
    });

    it('properly encodes URL parameters', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockQuoteResponse),
      );

      await fetchBorrowQuotesFromApi(
        'test rune with spaces',
        '1000',
        'bc1+special@chars',
      );

      expect(fetch).toHaveBeenCalledWith(
        '/api/liquidium/borrow/quotes?runeId=test%20rune%20with%20spaces&runeAmount=1000&address=bc1%2Bspecial%40chars',
      );
    });

    it('throws error when JSON parsing fails', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchJsonError());

      await expect(
        fetchBorrowQuotesFromApi('test-rune-id', '500', 'bc1test123'),
      ).rejects.toThrow('Failed to parse borrow quotes for test-rune-id');
    });

    it('throws error for non-OK response with error.message', async () => {
      const errorResponse = {
        error: { message: 'Rune not found' },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 404),
      );

      await expect(
        fetchBorrowQuotesFromApi('invalid-rune', '500', 'bc1test123'),
      ).rejects.toThrow('Rune not found');
    });

    it('throws error for non-OK response with string error', async () => {
      const errorResponse = {
        error: 'Invalid amount',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 400),
      );

      await expect(
        fetchBorrowQuotesFromApi('test-rune-id', 'invalid', 'bc1test123'),
      ).rejects.toThrow('Invalid amount');
    });

    it('throws error for non-OK response with message field', async () => {
      const errorResponse = {
        message: 'Server temporarily unavailable',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 503),
      );

      await expect(
        fetchBorrowQuotesFromApi('test-rune-id', '500', 'bc1test123'),
      ).rejects.toThrow('Server temporarily unavailable');
    });

    it('throws default error for non-OK response without error details', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({}, false, 500),
      );

      await expect(
        fetchBorrowQuotesFromApi('test-rune-id', '500', 'bc1test123'),
      ).rejects.toThrow('Failed to fetch borrow quotes: Server Error');
    });
  });

  describe('prepareLiquidiumBorrow', () => {
    const mockPrepareParams = {
      instant_offer_id: 'offer-123',
      fee_rate: 10,
      token_amount: '500',
      borrower_payment_address: 'bc1payment123',
      borrower_payment_pubkey: 'pubkey123',
      borrower_ordinal_address: 'bc1ordinal123',
      borrower_ordinal_pubkey: 'ordinalpubkey123',
      address: 'bc1user123',
    };

    const mockPrepareResponse: LiquidiumPrepareBorrowResponse = {
      success: true,
      data: {
        prepare_offer_id: 'prepare-123',
        base64_psbt: 'cHNidAEBAA==',
        sides: [
          {
            index: 0,
            address: 'bc1test123',
            sighash: 1,
            disable_tweak_signer: false,
          },
        ],
      },
    };

    it('prepares borrow transaction successfully', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockPrepareResponse),
      );

      const result = await prepareLiquidiumBorrow(mockPrepareParams);

      expect(fetch).toHaveBeenCalledWith('/api/liquidium/borrow/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPrepareParams),
      });
      expect(result).toEqual(mockPrepareResponse);
    });

    it('throws error when JSON parsing fails', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchJsonError());

      await expect(prepareLiquidiumBorrow(mockPrepareParams)).rejects.toThrow(
        'Failed to parse prepare borrow response',
      );
    });

    it('throws error for non-OK response with error.message', async () => {
      const errorResponse = {
        error: { message: 'Insufficient collateral' },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 400),
      );

      await expect(prepareLiquidiumBorrow(mockPrepareParams)).rejects.toThrow(
        'Insufficient collateral',
      );
    });

    it('throws error for non-OK response with string error', async () => {
      const errorResponse = {
        error: 'Invalid fee rate',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 400),
      );

      await expect(prepareLiquidiumBorrow(mockPrepareParams)).rejects.toThrow(
        'Invalid fee rate',
      );
    });

    it('throws default error for non-OK response without error details', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({}, false, 500),
      );

      await expect(prepareLiquidiumBorrow(mockPrepareParams)).rejects.toThrow(
        'Failed to prepare borrow: Server Error',
      );
    });
  });

  describe('submitLiquidiumBorrow', () => {
    const mockSubmitParams = {
      signed_psbt_base_64: 'cHNidAEBAA==signed',
      prepare_offer_id: 'prepare-123',
      address: 'bc1user123',
    };

    const mockSubmitResponse: LiquidiumSubmitBorrowResponse = {
      success: true,
      data: {
        loan_transaction_id: 'tx123abc',
      },
    };

    it('submits borrow transaction successfully', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockSubmitResponse),
      );

      const result = await submitLiquidiumBorrow(mockSubmitParams);

      expect(fetch).toHaveBeenCalledWith('/api/liquidium/borrow/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockSubmitParams),
      });
      expect(result).toEqual(mockSubmitResponse);
    });

    it('handles successful response with JSON parse failure', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchJsonError(true, 200),
      );

      const result = await submitLiquidiumBorrow(mockSubmitParams);

      expect(result).toEqual({
        success: true,
        data: {
          loan_transaction_id: mockSubmitParams.prepare_offer_id,
        },
      });
    });

    it('throws error when JSON parsing fails on non-OK response', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchJsonError(false, 500),
      );

      await expect(submitLiquidiumBorrow(mockSubmitParams)).rejects.toThrow(
        'Failed to parse submit borrow response',
      );
    });

    it('throws error for non-OK response with error.message', async () => {
      const errorResponse = {
        error: { message: 'PSBT signature invalid' },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 400),
      );

      await expect(submitLiquidiumBorrow(mockSubmitParams)).rejects.toThrow(
        'PSBT signature invalid',
      );
    });

    it('throws error for non-OK response with string error', async () => {
      const errorResponse = {
        error: 'Transaction already submitted',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 409),
      );

      await expect(submitLiquidiumBorrow(mockSubmitParams)).rejects.toThrow(
        'Transaction already submitted',
      );
    });

    it('throws default error for non-OK response without error details', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({}, false, 500),
      );

      await expect(submitLiquidiumBorrow(mockSubmitParams)).rejects.toThrow(
        'Failed to submit borrow: Server Error',
      );
    });
  });

  describe('repayLiquidiumLoan', () => {
    const mockRepayResponse: RepayLiquidiumLoanResponse = {
      success: true,
      data: {
        psbt: 'cHNidAEBAA==repay',
        repaymentAmountSats: 1100,
        loanId: 'loan-123',
      },
    };

    it('initiates loan repayment successfully', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockRepayResponse),
      );

      const result = await repayLiquidiumLoan('loan-123', 'bc1user123');

      expect(fetch).toHaveBeenCalledWith('/api/liquidium/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: 'loan-123', address: 'bc1user123' }),
      });
      expect(result).toEqual(mockRepayResponse);
    });

    it('transforms API response fields correctly', async () => {
      const apiResponse = {
        success: true,
        data: {
          base64_psbt: 'cHNidAEBAA==api',
          repayment_amount_sats: 1200,
          offer_id: 'offer-456',
          extra_field: 'value',
        },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(apiResponse),
      );

      const result = await repayLiquidiumLoan('loan-123', 'bc1user123');

      expect(result.data).toEqual({
        psbt: 'cHNidAEBAA==api',
        repaymentAmountSats: 1200,
        loanId: 'offer-456',
        base64_psbt: 'cHNidAEBAA==api',
        repayment_amount_sats: 1200,
        offer_id: 'offer-456',
        extra_field: 'value',
      });
    });

    it('prefers psbt field over base64_psbt when both exist', async () => {
      const apiResponse = {
        success: true,
        data: {
          psbt: 'cHNidAEBAA==psbt',
          base64_psbt: 'cHNidAEBAA==base64',
          repayment_amount_sats: 1200,
        },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(apiResponse),
      );

      const result = await repayLiquidiumLoan('loan-123', 'bc1user123');

      expect(result.data?.psbt).toBe('cHNidAEBAA==psbt');
    });

    it('uses loanId parameter when offer_id not in response', async () => {
      const apiResponse = {
        success: true,
        data: {
          base64_psbt: 'cHNidAEBAA==',
          repayment_amount_sats: 1200,
        },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(apiResponse),
      );

      const result = await repayLiquidiumLoan('loan-456', 'bc1user123');

      expect(result.data?.loanId).toBe('loan-456');
    });

    it('returns response as-is when no data field', async () => {
      const simpleResponse = {
        success: false,
        error: 'Loan not found',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(simpleResponse),
      );

      const result = await repayLiquidiumLoan('invalid-loan', 'bc1user123');

      expect(result).toEqual(simpleResponse);
    });

    it('throws error when JSON parsing fails', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchJsonError());

      await expect(
        repayLiquidiumLoan('loan-123', 'bc1user123'),
      ).rejects.toThrow('Failed to parse repay response');
    });

    it('throws error for non-OK response with error.message', async () => {
      const errorResponse = {
        error: { message: 'Loan already repaid' },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 400),
      );

      await expect(
        repayLiquidiumLoan('loan-123', 'bc1user123'),
      ).rejects.toThrow('Loan already repaid');
    });

    it('throws error for non-OK response with string error', async () => {
      const errorResponse = {
        error: 'Insufficient balance',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 400),
      );

      await expect(
        repayLiquidiumLoan('loan-123', 'bc1user123'),
      ).rejects.toThrow('Insufficient balance');
    });

    it('throws default error for non-OK response without error details', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({}, false, 404),
      );

      await expect(
        repayLiquidiumLoan('loan-123', 'bc1user123'),
      ).rejects.toThrow('Failed to repay loan: Not Found');
    });
  });

  describe('submitRepayPsbt', () => {
    const mockSubmitRepayResponse: SubmitRepayResponse = {
      success: true,
      data: {
        repayment_transaction_id: 'repay-tx-123',
      },
    };

    it('submits repay PSBT successfully', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockSubmitRepayResponse),
      );

      const result = await submitRepayPsbt(
        'loan-123',
        'cHNidAEBAA==signed',
        'bc1user123',
      );

      expect(fetch).toHaveBeenCalledWith('/api/liquidium/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: 'loan-123',
          signedPsbt: 'cHNidAEBAA==signed',
          address: 'bc1user123',
        }),
      });
      expect(result).toEqual(mockSubmitRepayResponse);
    });

    it('throws error when JSON parsing fails', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchJsonError());

      await expect(
        submitRepayPsbt('loan-123', 'cHNidAEBAA==signed', 'bc1user123'),
      ).rejects.toThrow('Failed to parse repay submission response');
    });

    it('throws error for non-OK response with error.message', async () => {
      const errorResponse = {
        error: { message: 'Invalid PSBT signature' },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 400),
      );

      await expect(
        submitRepayPsbt('loan-123', 'cHNidAEBAA==signed', 'bc1user123'),
      ).rejects.toThrow('Invalid PSBT signature');
    });

    it('throws error for non-OK response with string error', async () => {
      const errorResponse = {
        error: 'PSBT already processed',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 409),
      );

      await expect(
        submitRepayPsbt('loan-123', 'cHNidAEBAA==signed', 'bc1user123'),
      ).rejects.toThrow('PSBT already processed');
    });

    it('throws default error for non-OK response without error details', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({}, false, 500),
      );

      await expect(
        submitRepayPsbt('loan-123', 'cHNidAEBAA==signed', 'bc1user123'),
      ).rejects.toThrow('Failed to submit repayment: Server Error');
    });
  });

  describe('fetchBorrowRangesFromApi', () => {
    const mockRangeResponse: BorrowRangeResponse = {
      success: true,
      data: {
        runeId: 'test-rune-id',
        minAmount: '100',
        maxAmount: '10000',
        loanTermDays: [30, 60, 90],
        cached: true,
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    it('fetches borrow ranges successfully', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockRangeResponse),
      );

      const result = await fetchBorrowRangesFromApi(
        'test-rune-id',
        'bc1user123',
      );

      expect(fetch).toHaveBeenCalledWith(
        '/api/liquidium/borrow/ranges?runeId=test-rune-id&address=bc1user123',
      );
      expect(result).toEqual(mockRangeResponse);
    });

    it('properly encodes URL parameters', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(mockRangeResponse),
      );

      await fetchBorrowRangesFromApi('rune with spaces', 'bc1+special@chars');

      expect(fetch).toHaveBeenCalledWith(
        '/api/liquidium/borrow/ranges?runeId=rune%20with%20spaces&address=bc1%2Bspecial%40chars',
      );
    });

    it('throws error when JSON parsing fails', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchJsonError());

      await expect(
        fetchBorrowRangesFromApi('test-rune-id', 'bc1user123'),
      ).rejects.toThrow('Failed to parse borrow ranges for test-rune-id');
    });

    it('throws error for non-OK response with error.message', async () => {
      const errorResponse = {
        error: { message: 'Rune not supported for borrowing' },
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 400),
      );

      await expect(
        fetchBorrowRangesFromApi('unsupported-rune', 'bc1user123'),
      ).rejects.toThrow('Rune not supported for borrowing');
    });

    it('throws error for non-OK response with string error', async () => {
      const errorResponse = {
        error: 'Service temporarily unavailable',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 503),
      );

      await expect(
        fetchBorrowRangesFromApi('test-rune-id', 'bc1user123'),
      ).rejects.toThrow('Service temporarily unavailable');
    });

    it('throws error for non-OK response with message field', async () => {
      const errorResponse = {
        message: 'Rate limit exceeded',
      };

      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse(errorResponse, false, 429),
      );

      await expect(
        fetchBorrowRangesFromApi('test-rune-id', 'bc1user123'),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('throws default error for non-OK response without error details', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        mockFetchResponse({}, false, 500),
      );

      await expect(
        fetchBorrowRangesFromApi('test-rune-id', 'bc1user123'),
      ).rejects.toThrow('Failed to fetch borrow ranges: Server Error');
    });
  });
});
