import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getLiquidiumClient } from "@/lib/serverUtils";
import { createSuccessResponse, createErrorResponse } from "@/lib/apiUtils";

// GET /api/liquidium/portfolio?address=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");
    if (!address) {
      return createErrorResponse(
        "Missing address",
        "address query param is required",
        400,
      );
    }
    const { data: tokenRows, error: tokenError } = await supabase
      .from("liquidium_tokens")
      .select("jwt")
      .eq("wallet_address", address)
      .limit(1);
    if (tokenError) {
      console.error("[Liquidium] Supabase error:", tokenError);
      return createErrorResponse(
        "Database error",
        JSON.stringify(tokenError),
        500,
      );
    }
    if (!tokenRows || tokenRows.length === 0) {
      console.warn("[Liquidium] No JWT found for address:", address);
      return createErrorResponse(
        "Not authenticated with Liquidium",
        "No JWT found for this address",
        401,
      );
    }
    const userJwt = tokenRows[0].jwt;
    const liquidium = getLiquidiumClient();
    const portfolio = await liquidium.getPortfolio(userJwt);
    if (!portfolio || !portfolio.offers) {
      console.warn("[Liquidium] No offers found in portfolio response");
      return createSuccessResponse([]); // Return empty array if no offers
    }
    return createSuccessResponse(portfolio.offers);
  } catch (error) {
    console.error("[Liquidium] Portfolio route error:", error);
    return createErrorResponse(
      "Failed to fetch Liquidium portfolio",
      error instanceof Error ? error.message : String(error),
      500,
    );
  }
}
