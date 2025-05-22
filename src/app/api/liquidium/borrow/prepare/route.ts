import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateRequest,
} from "@/lib/apiUtils";
import { callLiquidiumApi } from "@/lib/liquidiumServer";
import { supabase } from "@/lib/supabase";

// Schema for request body
const prepareBodySchema = z.object({
  instant_offer_id: z.string().uuid(),
  fee_rate: z.number().positive(),
  token_amount: z
    .string()
    .min(1)
    .regex(/^\d+$/, "Token amount must be a positive integer string"),
  borrower_payment_address: z.string().min(1),
  borrower_payment_pubkey: z.string().min(1),
  borrower_ordinal_address: z.string().min(1),
  borrower_ordinal_pubkey: z.string().min(1),
  collateral_asset_id: z.string().optional(), // Optional field for rune ID
  address: z.string().min(1), // User's address to find JWT
});

export async function POST(request: NextRequest) {
  // Validate request body
  const validation = await validateRequest(request, prepareBodySchema, "body");
  if (!validation.success) {
    return validation.errorResponse;
  }
  // Exclude 'address' from the data sent to Liquidium
  const { address, ...liquidiumPayload } = validation.data;

  try {
    // 1. Get User JWT from Supabase
    const { data: tokenRows, error: tokenError } = await supabase
      .from("liquidium_tokens")
      .select("jwt")
      .eq("wallet_address", address)
      .limit(1);

    if (tokenError) {
      return createErrorResponse(
        "Database error retrieving authentication",
        tokenError.message,
        500,
      );
    }
    if (!tokenRows || tokenRows.length === 0) {
      return createErrorResponse(
        "Liquidium authentication required",
        "No JWT found for this address",
        401,
      );
    }
    const userJwt = tokenRows[0].jwt;

    // 2. Call Liquidium API
    const result = await callLiquidiumApi(
      "/api/v1/borrower/loans/start/prepare",
      {
        method: "POST",
        userJwt,
        body: JSON.stringify(liquidiumPayload),
      },
      "Liquidium prepare borrow",
    );

    if (!result.ok) {
      return createErrorResponse(
        result.message ?? "Error",
        result.details,
        result.status,
      );
    }

    return createSuccessResponse(result.data); // Forward Liquidium's response
  } catch (error) {
    const errorInfo = handleApiError(
      error,
      "Failed to prepare borrow transaction",
    );
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
