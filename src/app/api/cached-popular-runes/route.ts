import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/lib/apiUtils';
import {
  cachePopularRunes,
  getCachedPopularRunesWithMetadata,
  updateLastRefreshAttempt,
} from '@/lib/popularRunesCache';
import { getSatsTerminalClient } from '@/lib/serverUtils';

/**
 * Optimized popular runes endpoint with improved caching strategy
 * - Always returns cached data when available
 * - Only attempts to refresh cache after a reasonable backoff period
 * - Refreshes cache in the background without blocking the response
 * - Uses a hardcoded fallback list when API is completely unreachable
 */
export async function GET() {
  try {
    // Get cached data with detailed metadata
    const { cachedData, shouldAttemptRefresh, isStale, lastRefreshAttempt } =
      await getCachedPopularRunesWithMetadata();

    // CRITICAL: We ALWAYS return cached data immediately when available
    // Even if it's expired, we use the stale-while-revalidate pattern
    if (cachedData) {
      // If cache is not completely stale and we should attempt to refresh,
      // start a background refresh without awaiting the result
      if (!isStale && shouldAttemptRefresh) {
        // Update the last refresh attempt timestamp immediately
        // This prevents multiple concurrent refresh attempts
        updateLastRefreshAttempt().catch(console.error);

        // Start background refresh without awaiting or blocking
        refreshPopularRunesInBackground().catch((error) => {
          console.warn('Background refresh of popular runes failed:', error);
        });
      }

      // Return the cached data with a flag indicating if it's stale
      return createSuccessResponse({
        data: cachedData,
        isStale,
        cacheAge: lastRefreshAttempt
          ? new Date(lastRefreshAttempt).toISOString()
          : null,
      });
    }

    // If we have no cached data at all (first run), we need to fetch synchronously
    try {
      const terminal = getSatsTerminalClient();
      const popularResponse = await terminal.popularTokens({});

      // Validate response
      if (!popularResponse || typeof popularResponse !== 'object') {
        throw new Error('Invalid response from SatsTerminal API');
      }

      // Cache the fresh data and return it
      if (Array.isArray(popularResponse)) {
        await cachePopularRunes(popularResponse);
        return createSuccessResponse(popularResponse);
      } else {
        throw new Error('Unexpected response format from SatsTerminal API');
      }
    } catch (error) {
      // Something went wrong, but we have fallbacks in the cache module
      const { cachedData } = await getCachedPopularRunesWithMetadata();

      // Log the error but return whatever we have (which would be at least the fallback list)
      console.error('Failed to fetch initial popular runes:', error);
      return createSuccessResponse({
        data: cachedData,
        isStale: true,
        error: 'Failed to fetch fresh data',
      });
    }
  } catch (error) {
    const errorInfo = handleApiError(
      error,
      'Failed to fetch cached popular collections',
    );
    return createErrorResponse(
      errorInfo.message,
      errorInfo.details,
      errorInfo.status,
    );
  }
}

/**
 * Function to refresh popular runes data in the background
 * This is called without awaiting the result to prevent blocking the response
 */
async function refreshPopularRunesInBackground(): Promise<void> {
  try {
    const terminal = getSatsTerminalClient();
    const popularResponse = await terminal.popularTokens({});

    // Validate and cache if valid
    if (
      popularResponse &&
      typeof popularResponse === 'object' &&
      Array.isArray(popularResponse)
    ) {
      await cachePopularRunes(popularResponse);
    } else {
      console.warn('Invalid response format from SatsTerminal API');
    }
  } catch (error) {
    console.error('Failed to refresh popular runes in background:', error);
    // The error is caught and logged, but never thrown, so it doesn't affect the user experience
  }
}
