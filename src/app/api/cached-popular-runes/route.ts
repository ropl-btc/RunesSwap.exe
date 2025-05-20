import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/lib/apiUtils";
import {
  getCachedPopularRunesWithExpiry,
  cachePopularRunes,
} from "@/lib/popularRunesCache";
import { getSatsTerminalClient } from "@/lib/serverUtils";

export async function GET() {
  try {
    // First try to get from cache, even if expired (as a fallback)
    const { cachedData, isExpired } = await getCachedPopularRunesWithExpiry();

    // If we have cached data and it's not expired, return it immediately
    if (cachedData && !isExpired) {
      return createSuccessResponse(cachedData);
    }

    // If cache is expired but we have data, try to refresh but use cached as fallback
    if (cachedData && isExpired) {
      try {
        const terminal = getSatsTerminalClient();
        const popularResponse = await terminal.popularCollections({});

        // Validate response structure
        if (!popularResponse || typeof popularResponse !== "object") {
          console.warn(
            "Invalid response from SatsTerminal, using expired cache",
          );
          return createSuccessResponse(cachedData);
        }

        // Cache the fresh data
        if (Array.isArray(popularResponse)) {
          await cachePopularRunes(popularResponse);
          return createSuccessResponse(popularResponse);
        }

        // If response is not an array, use cached data
        return createSuccessResponse(cachedData);
      } catch (error) {
        console.warn(
          "Error refreshing popular runes, using expired cache:",
          error,
        );
        return createSuccessResponse(cachedData);
      }
    }

    // No cache available, must fetch from API
    try {
      const terminal = getSatsTerminalClient();
      const popularResponse = await terminal.popularCollections({});

      // Validate response structure
      if (!popularResponse || typeof popularResponse !== "object") {
        return createErrorResponse(
          "Invalid response from SatsTerminal",
          "Popular collections data is malformed",
          500,
        );
      }

      // Cache the fresh data
      if (Array.isArray(popularResponse)) {
        await cachePopularRunes(popularResponse);
      }

      return createSuccessResponse(popularResponse);
    } catch (error) {
      // If we get here, we have no cache and the API failed
      const errorInfo = handleApiError(
        error,
        "Failed to fetch popular collections",
      );

      // Return a more specific error for rate limiting
      if (
        (typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string" &&
          error.message.includes("Rate limit")) ||
        errorInfo.status === 429
      ) {
        return createErrorResponse(
          "Rate limit exceeded",
          "Please try again later",
          429,
        );
      }

      return createErrorResponse(
        errorInfo.message,
        errorInfo.details,
        errorInfo.status,
      );
    }
  } catch (error) {
    const errorInfo = handleApiError(
      error,
      "Failed to fetch cached popular collections",
    );
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}
