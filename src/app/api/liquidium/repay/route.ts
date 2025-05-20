import { createErrorResponse, createSuccessResponse } from "@/lib/apiUtils";
import { supabase } from "@/lib/supabase";

// POST /api/liquidium/repay
export async function POST(request: Request) {
  try {
    const { loanId, address, signedPsbt } = await request.json();
    if (!loanId || !address) {
      return createErrorResponse(
        "Missing parameters",
        "loanId and address are required",
        400,
      );
    }
    // Look up JWT for this address using regular client
    const { data: tokenRows, error: tokenError } = await supabase
      .from("liquidium_tokens")
      .select("jwt")
      .eq("wallet_address", address)
      .limit(1);
    if (tokenError) {
      return createErrorResponse(
        "Database error",
        JSON.stringify(tokenError),
        500,
      );
    }
    if (!tokenRows || tokenRows.length === 0) {
      return createErrorResponse(
        "Not authenticated with Liquidium",
        "No JWT found for this address",
        401,
      );
    }
    const userJwt = tokenRows[0].jwt;
    const apiKey = process.env.LIQUIDIUM_API_KEY;
    const apiUrl =
      process.env.LIQUIDIUM_API_URL || "https://alpha.liquidium.fi";
    if (signedPsbt) {
      // Step 2: Submit signed PSBT to Liquidium
      const submitRes = await fetch(
        `${apiUrl}/api/v1/borrower/loans/repay/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "x-user-token": userJwt,
          },
          body: JSON.stringify({
            offer_id: loanId,
            signed_psbt_base_64: signedPsbt,
          }),
        },
      );
      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        return createErrorResponse(
          "Liquidium API error",
          submitData?.error || "Failed to submit repayment",
          500,
        );
      }
      return createSuccessResponse(submitData);
    } else {
      // Step 1: Prepare repayment PSBT
      const feeRate = 5; // default fee rate in sat/vB
      const liquidiumRes = await fetch(
        `${apiUrl}/api/v1/borrower/loans/repay/prepare`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "x-user-token": userJwt,
          },
          body: JSON.stringify({ offer_id: loanId, fee_rate: feeRate }),
        },
      );
      const repayData = await liquidiumRes.json();
      if (!liquidiumRes.ok) {
        return createErrorResponse(
          "Liquidium API error",
          repayData?.error || "Failed to prepare repayment",
          500,
        );
      }
      return createSuccessResponse(repayData);
    }
  } catch (error) {
    return createErrorResponse(
      "Failed to process repayment",
      error instanceof Error ? error.message : String(error),
      500,
    );
  }
}
