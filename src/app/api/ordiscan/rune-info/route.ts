import { NextRequest } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateRequest,
} from "@/lib/apiUtils";
import { getRuneData } from "@/lib/runesData";
import { normalizeRuneName } from "@/utils/runeUtils";
import { z } from "zod";

export async function GET(request: NextRequest) {
  // Zod validation for 'name'
  const schema = z.object({ name: z.string().min(1) });
  const validation = await validateRequest(request, schema, "query");
  if (!validation.success) return validation.errorResponse;
  const { name: validName } = validation.data;

  // Ensure name doesn't have spacers for the API call
  const formattedName = normalizeRuneName(validName);

  try {
    const runeInfo = await getRuneData(formattedName);

    if (!runeInfo) {
      return createSuccessResponse(null, 404);
    }

    return createSuccessResponse(runeInfo);
  } catch (error: unknown) {
    const errorInfo = handleApiError(
      error,
      `Failed to fetch info for rune ${formattedName}`,
    );
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
