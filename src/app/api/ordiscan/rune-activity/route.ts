import { NextRequest } from "next/server";
import { getOrdiscanClient } from "@/lib/serverUtils";
import { RuneActivityEvent } from "@/types/ordiscan";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateRequest,
} from "@/lib/apiUtils";
import { z } from "zod";


export async function GET(request: NextRequest) {

  // Zod validation for 'address'
  const schema = z.object({ address: z.string().min(1) });
  const validation = await validateRequest(request, schema, "query");
  if (!validation.success) {
    return validation.errorResponse;
  }
  const { address: validAddress } = validation.data;


  try {
    const ordiscan = getOrdiscanClient();
    const activity: RuneActivityEvent[] =
      await ordiscan.address.getRunesActivity({ address: validAddress });

    // Ensure we always return a valid array
    const validActivity = Array.isArray(activity) ? activity : [];

    return createSuccessResponse(validActivity);
  } catch (error) {
    const errorInfo = handleApiError(
      error,
      `Failed to fetch rune activity for address ${validAddress}`,
    );
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
