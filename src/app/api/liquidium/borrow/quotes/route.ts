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

// Schema for query parameters
const quoteParamsSchema = z.object({
  runeId: z.string().min(1),
  runeAmount: z
    .string()
    .min(1)
    .regex(/^\d+$/, "Amount must be a positive integer string"),
  address: z.string().min(1), // User's address to find JWT
});

export async function GET(request: NextRequest) {
  // Validate query parameters first
  const validation = await validateRequest(request, quoteParamsSchema, "query");
  if (!validation.success) {
    return validation.errorResponse;
  }

  let { runeId } = validation.data;
  const { runeAmount, address } = validation.data;

  try {
    // 0. Look up the actual rune ID from our database
    // First check if the runeId is already in the correct format (e.g., "810010:907")
    if (runeId.includes(":")) {
    } else {
      // Try to find by name first
      const { data: runeDataByName, error: runeErrorByName } = await supabase
        .from("runes")
        .select("id")
        .ilike("name", runeId)
        .limit(1);

      if (runeErrorByName) {
      } else if (runeDataByName && runeDataByName.length > 0) {
        const actualRuneId = runeDataByName[0].id;
        runeId = actualRuneId;
      } else {
        // If not found by name, try to find by ID prefix

        const { data: runeDataById, error: runeErrorById } = await supabase
          .from("runes")
          .select("id")
          .ilike("id", `${runeId}:%`)
          .limit(1);

        if (runeErrorById) {
        } else if (runeDataById && runeDataById.length > 0) {
          const actualRuneId = runeDataById[0].id;
          runeId = actualRuneId;
        } else {
          // Special case for LIQUIDIUMTOKEN
          if (runeId.toLowerCase() === "liquidiumtoken") {
            const { data: liquidiumData, error: liquidiumError } =
              await supabase
                .from("runes")
                .select("id")
                .eq("name", "LIQUIDIUMTOKEN")
                .limit(1);

            if (liquidiumError) {
            } else if (liquidiumData && liquidiumData.length > 0) {
              const actualRuneId = liquidiumData[0].id;
              runeId = actualRuneId;
            }
          } else {
          }
        }
      }
    }

    // 1. Get User JWT from Supabase
    const { data: tokenRows, error: tokenError } = await supabase
      .from("liquidium_tokens")
      .select("jwt, expires_at")
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
        "No JWT found for this address. Please authenticate with Liquidium first.",
        401,
      );
    }

    const userJwt = tokenRows[0].jwt;
    const expiresAt = tokenRows[0].expires_at;

    // Check if JWT is expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return createErrorResponse(
        "Authentication expired",
        "Your authentication has expired. Please re-authenticate with Liquidium.",
        401,
      );
    }

    // 2. Call Liquidium API
    const result = await callLiquidiumApi(
      `/api/v1/borrower/collateral/runes/${encodeURIComponent(
        runeId,
      )}/offers?rune_amount=${runeAmount}`,
      { method: "GET", userJwt },
      "Liquidium borrow quotes",
    );

    if (!result.ok) {
      return createErrorResponse(
        result.message ?? "Error",
        result.details,
        result.status,
      );
    }

    return createSuccessResponse(result.data); // Forward Liquidium's response structure
  } catch (error) {
    const errorInfo = handleApiError(error, "Failed to fetch borrow quotes");
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
