export interface RepayLiquidiumLoanResponse {
  success: boolean;
  data?: {
    psbt: string;
    repaymentAmountSats: number;
    loanId: string;
    // Add more fields as needed
  };
  error?: string;
}

export const repayLiquidiumLoan = async (
  loanId: string,
  address: string,
): Promise<RepayLiquidiumLoanResponse> => {
  const response = await fetch("/api/liquidium/repay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loanId, address }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse repay response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to repay loan: ${response.statusText}`,
    );
  }
  // Map Liquidium API fields to expected frontend fields without mutating raw response
  if (data?.data) {
    // Create a new transformed data object instead of mutating the original
    const transformedData = {
      success: data.success,
      data: {
        psbt: data.data.base64_psbt || data.data.psbt,
        repaymentAmountSats: data.data.repayment_amount_sats,
        loanId: data.data.offer_id || loanId,
        ...data.data, // Include any other fields from the original data
      },
      error: data.error,
    };
    return transformedData;
  }
  return data;
};

export interface SubmitRepayResponse {
  success: boolean;
  data?: {
    repayment_transaction_id: string;
  };
  error?: string;
}

export const submitRepayPsbt = async (
  loanId: string,
  signedPsbt: string,
  address: string,
): Promise<SubmitRepayResponse> => {
  const response = await fetch("/api/liquidium/repay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loanId, signedPsbt, address }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse repay submission response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to submit repayment: ${response.statusText}`,
    );
  }
  return data;
};

// --- New Liquidium Borrow Types ---
// Response from GET /api/liquidium/borrow/quotes
export interface LiquidiumBorrowQuoteResponse {
  success: boolean;
  runeDetails?: {
    rune_id: string;
    slug: string;
    floor_price_sats: number;
    floor_price_last_updated_at: string;
    common_offer_data: {
      interest_rate: number;
      rune_divisibility: number;
    };
    valid_ranges: {
      rune_amount: { ranges: { min: string; max: string }[] };
      loan_term_days: number[];
    };
    offers: LiquidiumBorrowQuoteOffer[];
  };
  data?: {
    runeDetails: {
      rune_id: string;
      slug: string;
      floor_price_sats: number;
      floor_price_last_updated_at: string;
      common_offer_data: {
        interest_rate: number;
        rune_divisibility: number;
      };
      valid_ranges: {
        rune_amount: { ranges: { min: string; max: string }[] };
        loan_term_days: number[];
      };
      offers: LiquidiumBorrowQuoteOffer[];
    };
  };
  error?: { message: string; details?: string };
}

export interface LiquidiumBorrowQuoteOffer {
  offer_id: string; // UUID
  fungible_amount: number; // Typically 1 for runes? Check API docs
  loan_term_days: number | null;
  ltv_rate: number; // e.g., 80
  loan_breakdown: {
    total_repayment_sats: number;
    principal_sats: number;
    interest_sats: number;
    loan_due_by_date: string; // ISO Date
    activation_fee_sats: number;
    discount: {
      discount_rate: number;
      discount_sats: number;
    };
  };
}

// Response from POST /api/liquidium/borrow/prepare
export interface LiquidiumPrepareBorrowResponse {
  success: boolean;
  data?: {
    prepare_offer_id: string; // UUID
    base64_psbt: string;
    sides: {
      // Array defining which inputs to sign
      index: number;
      address: string | null;
      sighash: number | null;
      disable_tweak_signer: boolean;
    }[];
    // Might include utxo_content warnings like in repay
  };
  error?: string; // Changed to string to match error handling in BorrowTab
}

// Response from POST /api/liquidium/borrow/submit
export interface LiquidiumSubmitBorrowResponse {
  success: boolean;
  data?: {
    loan_transaction_id: string; // txid
  };
  error?: string; // Changed to string to match error handling in BorrowTab
}
// --- End New Liquidium Borrow Types ---

// --- New API Client Functions for Borrow ---

// Fetch Borrow Quotes from API
export const fetchBorrowQuotesFromApi = async (
  runeId: string,
  runeAmount: string, // Raw amount as string
  address: string,
): Promise<LiquidiumBorrowQuoteResponse> => {
  // Ensure we're using the correct rune ID format
  // If we have a rune name like "LIQUIDIUMTOKEN", we'll let the backend handle the lookup

  const url = `/api/liquidium/borrow/quotes?runeId=${encodeURIComponent(runeId)}&runeAmount=${runeAmount}&address=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url);
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Failed to parse borrow quotes for ${runeId}`);
    }

    if (!response.ok) {
      // Extract error message in a more robust way
      let errorMessage = "Unknown error";
      if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (typeof data?.error === "string") {
        errorMessage = data.error;
      } else if (data?.message) {
        errorMessage = data.message;
      } else {
        errorMessage = `Failed to fetch borrow quotes: ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    // Handle both response formats:
    // 1. API might return { success: true, data: { runeDetails: {...} } }
    // 2. Or directly { success: true, runeDetails: {...} }
    if (data.data?.runeDetails && !data.runeDetails) {
      data.runeDetails = data.data.runeDetails;
    }

    return data as LiquidiumBorrowQuoteResponse;
  } catch (error) {
    throw error; // Re-throw to let the component handle it
  }
};

// Prepare Liquidium Borrow Transaction
export const prepareLiquidiumBorrow = async (params: {
  instant_offer_id: string;
  fee_rate: number;
  token_amount: string; // Raw amount as string
  borrower_payment_address: string;
  borrower_payment_pubkey: string;
  borrower_ordinal_address: string;
  borrower_ordinal_pubkey: string;
  address: string; // User's address for JWT lookup
}): Promise<LiquidiumPrepareBorrowResponse> => {
  const response = await fetch("/api/liquidium/borrow/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse prepare borrow response");
  }
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Failed to prepare borrow: ${response.statusText}`,
    );
  }
  return data as LiquidiumPrepareBorrowResponse;
};

// Submit Liquidium Borrow Transaction
export const submitLiquidiumBorrow = async (params: {
  signed_psbt_base_64: string;
  prepare_offer_id: string;
  address: string; // User's address for JWT lookup
}): Promise<LiquidiumSubmitBorrowResponse> => {
  const response = await fetch("/api/liquidium/borrow/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    // If the response was OK but we couldn't parse JSON, create a synthetic success response
    if (response.ok) {
      return {
        success: true,
        data: {
          loan_transaction_id: params.prepare_offer_id,
        },
      };
    }

    throw new Error("Failed to parse submit borrow response");
  }

  if (!response.ok) {
    const errorMessage =
      data?.error?.message ||
      data?.error ||
      `Failed to submit borrow: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data as LiquidiumSubmitBorrowResponse;
};

// Interface for borrow range response
export interface BorrowRangeResponse {
  success: boolean;
  data?: {
    runeId: string;
    minAmount: string;
    maxAmount: string;
    loanTermDays?: number[];
    cached: boolean;
    updatedAt: string;
  };
  error?: string;
}

// Fetch Borrow Ranges from API
export const fetchBorrowRangesFromApi = async (
  runeId: string,
  address: string,
): Promise<BorrowRangeResponse> => {
  try {
    const url = `/api/liquidium/borrow/ranges?runeId=${encodeURIComponent(runeId)}&address=${encodeURIComponent(address)}`;

    const response = await fetch(url);

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Failed to parse borrow ranges for ${runeId}`);
    }

    if (!response.ok) {
      let errorMessage = "Unknown error";
      if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (typeof data?.error === "string") {
        errorMessage = data.error;
      } else if (data?.message) {
        errorMessage = data.message;
      } else {
        errorMessage = `Failed to fetch borrow ranges: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return data as BorrowRangeResponse;
  } catch (error) {
    throw error;
  }
};
