import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateRequest,
} from "@/lib/apiUtils";
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

    // 2. Prepare request to Liquidium
    // Get API credentials
    const apiUrl = process.env.LIQUIDIUM_API_URL;
    if (!apiUrl) {
      return createErrorResponse(
        "Server configuration error",
        "Missing API URL configuration",
        500,
      );
    }

    const apiKey = process.env.LIQUIDIUM_API_KEY;
    if (!apiKey) {
      return createErrorResponse(
        "Server configuration error",
        "Missing API key configuration",
        500,
      );
    }

    // Construct the correct URL according to the OpenAPI spec
    const fullUrl = `${apiUrl}/api/v1/borrower/collateral/runes/${encodeURIComponent(runeId)}/offers?rune_amount=${runeAmount}`;

    // 3. Call Liquidium API
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-user-token": userJwt, // Include user JWT
    };

    const liquidiumResponse = await fetch(fullUrl, {
      method: "GET",
      headers: headers,
    });

    const liquidiumData = await liquidiumResponse.json();

    if (!liquidiumResponse.ok) {
      // Try to provide a more helpful error message
      let errorMessage =
        liquidiumData?.errorMessage || JSON.stringify(liquidiumData);
      const errorCode = liquidiumData?.error || liquidiumResponse.statusText;

      if (
        errorCode === "NOT_FOUND" &&
        errorMessage.includes("Rune not found")
      ) {
        errorMessage = `Rune ID "${runeId}" not found or not supported by Liquidium. Please check if this rune is supported for borrowing.`;
      }

      return createErrorResponse(
        `Liquidium API error: ${errorCode}`,
        errorMessage,
        liquidiumResponse.status,
      );
    }

    // 4. Return successful response
    return createSuccessResponse(liquidiumData); // Forward Liquidium's response structure
  } catch (error) {
    const errorInfo = handleApiError(error, "Failed to fetch borrow quotes");
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
