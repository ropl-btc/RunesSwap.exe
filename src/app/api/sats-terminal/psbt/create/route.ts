import { NextRequest } from "next/server";
import type { GetPSBTParams } from "satsterminal-sdk";
import { getSatsTerminalClient } from "@/lib/serverUtils";
import { z } from "zod";
import {
  handleApiError,
  createErrorResponse,
  validateRequest,
} from "@/lib/apiUtils";
import { runeOrderSchema } from "@/types/satsTerminal";

type RuneOrder = z.infer<typeof runeOrderSchema>;

const getPsbtParamsSchema = z.object({
  orders: z.array(runeOrderSchema),
  address: z.string().min(1, "Bitcoin address is required"),
  publicKey: z.string().min(1, "Public key is required"),
  paymentAddress: z.string().min(1, "Payment address is required"),
  paymentPublicKey: z.string().min(1, "Payment public key is required"),
  runeName: z.string().min(1, "Rune name is required"),
  sell: z.boolean().optional(),
  rbfProtection: z.boolean().optional(),
  feeRate: z.number().optional(),
  slippage: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const validation = await validateRequest(
    request,
    getPsbtParamsSchema,
    "body",
  );
  if (!validation.success) return validation.errorResponse;
  const validatedParams = validation.data;

  try {
    const terminal = getSatsTerminalClient();
    const psbtParams: Omit<GetPSBTParams, "orders"> & { orders: RuneOrder[] } =
      {
        ...validatedParams,
        orders: validatedParams.orders,
      };

    const psbtResponse = await terminal.getPSBT(psbtParams);
    return createSuccessResponse(psbtResponse);
  } catch (error) {
    const errorInfo = handleApiError(error, "Failed to generate PSBT");
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Special handling for quote expired
    if (
      errorInfo.message.includes("Quote expired") ||
      (error &&
        typeof error === "object" &&
        (error as { code?: string }).code === "ERR677K3")
    ) {
      return createErrorResponse(
        "Quote expired. Please fetch a new quote.",
        errorInfo.details,
        410,
      );
    }

    // Special handling for rate limiting
    if (errorMessage.includes("Rate limit") || errorInfo.status === 429) {
      return createErrorResponse(
        "Rate limit exceeded",
        "Please try again later",
        429,
      );
    }

    // Handle unexpected token errors (HTML responses instead of JSON)
    if (errorMessage.includes("Unexpected token")) {
      return createErrorResponse(
        "API service unavailable",
        "The SatsTerminal API is currently unavailable. Please try again later.",
        503,
      );
    }

    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
