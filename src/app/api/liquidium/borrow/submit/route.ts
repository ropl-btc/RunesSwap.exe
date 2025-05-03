import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateRequest,
} from "@/lib/apiUtils";
import { supabase } from "@/lib/supabase";

// Schema for request body
const submitBodySchema = z.object({
  signed_psbt_base_64: z.string().min(1),
  prepare_offer_id: z.string().uuid(),
  address: z.string().min(1), // User's address to find JWT
});

export async function POST(request: NextRequest) {
  // Validate request body
  const validation = await validateRequest(request, submitBodySchema, "body");
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

    const fullUrl = `${apiUrl}/api/v1/borrower/loans/start/submit`;

    // 3. Call Liquidium API
    const liquidiumResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-user-token": userJwt,
      },
      body: JSON.stringify(liquidiumPayload),
    });

    // Get response text first to check if it's valid JSON
    const responseText = await liquidiumResponse.text();

    // Check if response is HTML (starts with <!DOCTYPE or <html)
    if (
      responseText.trim().startsWith("<!DOCTYPE") ||
      responseText.trim().startsWith("<html")
    ) {
      // Check if it's a successful response (contains success message)
      if (
        responseText.includes("success") ||
        responseText.includes("Success") ||
        liquidiumResponse.ok
      ) {
        return createSuccessResponse({
          loan_transaction_id: liquidiumPayload.prepare_offer_id, // Use prepare_offer_id as fallback
          message: "Loan successfully started",
          html_response: true,
        });
      } else {
        return createErrorResponse(
          "Liquidium API returned HTML instead of JSON",
          "The loan service returned an unexpected response format. Please try again later.",
          500,
        );
      }
    }

    // Try to parse JSON response
    let liquidiumData;
    try {
      liquidiumData = JSON.parse(responseText);
    } catch {
      // If response is OK but not valid JSON, assume success
      if (liquidiumResponse.ok) {
        return createSuccessResponse({
          loan_transaction_id: liquidiumPayload.prepare_offer_id, // Use prepare_offer_id as fallback
          message: "Loan successfully started",
          raw_response: responseText.substring(0, 100), // Include part of the response for debugging
        });
      } else {
        return createErrorResponse(
          "Invalid response from Liquidium API",
          "The loan service returned an invalid response. Please try again later.",
          500,
        );
      }
    }

    if (!liquidiumResponse.ok) {
      return createErrorResponse(
        `Liquidium API error: ${liquidiumData?.error || liquidiumResponse.statusText}`,
        liquidiumData?.errorMessage || JSON.stringify(liquidiumData),
        liquidiumResponse.status,
      );
    }

    // 4. Return successful response
    return createSuccessResponse(liquidiumData); // Forward Liquidium's response
  } catch (error) {
    const errorInfo = handleApiError(
      error,
      "Failed to submit borrow transaction",
    );
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
