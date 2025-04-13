import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';
import { getCachedPopularRunes, cachePopularRunes } from '@/lib/popularRunesCache';
import { getSatsTerminalClient } from '@/lib/serverUtils';

export async function GET() {
  try {
    // First try to get from cache
    const cachedData = await getCachedPopularRunes();
    if (cachedData) {
      console.log('[cached-popular-runes API] Returning cached data');
      return createSuccessResponse(cachedData);
    }

    // If not in cache, fetch from SatsTerminal and store in cache
    console.log('[cached-popular-runes API] Fetching fresh data from SatsTerminal');
    const terminal = getSatsTerminalClient();
    const popularResponse = await terminal.popularCollections({});
    
    // Validate response structure
    if (!popularResponse || typeof popularResponse !== 'object') {
      return createErrorResponse('Invalid response from SatsTerminal', 'Popular collections data is malformed', 500);
    }

    // Cache the fresh data
    if (Array.isArray(popularResponse)) {
      await cachePopularRunes(popularResponse);
    }
    
    return createSuccessResponse(popularResponse);
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to fetch cached popular collections');
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 