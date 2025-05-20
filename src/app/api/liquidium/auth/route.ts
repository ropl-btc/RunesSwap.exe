import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateRequest,
} from "@/lib/apiUtils";
import { supabase } from "@/lib/supabase";
import { getLiquidiumClient } from "@/lib/serverUtils";
import type { LiquidiumAuthSubmitSuccessResponse } from "@/types/liquidium";

const AuthSchema = z.object({
  ordinalsAddress: z.string().min(1),
  paymentAddress: z.string().min(1),
  ordinalsSignature: z.string().min(1),
  paymentSignature: z.string().optional(),
  ordinalsNonce: z.string().min(1),
  paymentNonce: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, AuthSchema, "body");
  if (!validation.success) return validation.errorResponse;
  const {
    ordinalsAddress,
    paymentAddress,
    ordinalsSignature,
    paymentSignature,
    ordinalsNonce,
    paymentNonce,
  } = validation.data;

  try {
    const liquidium = getLiquidiumClient();
    // Step 1: Submit signatures to Liquidium
    const submitData: Record<string, unknown> = {
      ordinals: {
        address: ordinalsAddress,
        signature: ordinalsSignature,
        nonce: ordinalsNonce,
      },
    };
    if (paymentSignature && paymentNonce) {
      submitData.payment = {
        address: paymentAddress,
        signature: paymentSignature,
        nonce: paymentNonce,
      };
    }
    const authSubmitResponse: LiquidiumAuthSubmitSuccessResponse =
      await liquidium.authSubmit(submitData);
    // Decode JWT to get expiry
    let expiresAt: Date | null = null;
    try {
      const jwtParts = authSubmitResponse.user_jwt.split(".");
      if (jwtParts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(jwtParts[1], "base64").toString("utf8"),
        );
        if (payload.exp) {
          expiresAt = new Date(payload.exp * 1000);
        }
      }
    } catch (e) {
      console.warn("[API Debug] Failed to decode JWT for expiry:", e);
    }
    // Store JWT in Supabase
    const upsertData = {
      wallet_address: ordinalsAddress,
      ordinals_address: ordinalsAddress,
      payment_address: paymentAddress,
      jwt: authSubmitResponse.user_jwt,
      expires_at: expiresAt,
      last_used_at: new Date().toISOString(),
    };
    console.info("[API Debug] Upserting Liquidium JWT with data:", upsertData);

    // Now using regular client as we have proper RLS policies in place
    const { error, data: upsertResult } = await supabase
      .from("liquidium_tokens")
      .upsert(upsertData, { onConflict: "wallet_address" });

    if (error) {
      console.error("[API Error] Failed to store Liquidium JWT", error);
      return createErrorResponse(
        "Failed to store Liquidium JWT",
        JSON.stringify(error),
        500,
      );
    }
    console.info("[API Debug] Upsert result:", upsertResult);
    return createSuccessResponse({ jwt: authSubmitResponse.user_jwt });
  } catch (error) {
    const errorInfo = handleApiError(error, "Liquidium authentication failed");
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
