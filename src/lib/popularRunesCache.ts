import { supabase } from "./supabase";

// Fallback list of popular runes to use when API is completely unreachable
// This ensures the app will always have some basic functionality
const FALLBACK_POPULAR_RUNES = [
  {
    id: "liquidiumtoken",
    rune: "LIQUIDIUM•TOKEN",
    name: "LIQUIDIUM•TOKEN",
    imageURI: "https://icon.unisat.io/icon/runes/LIQUIDIUM%E2%80%A2TOKEN",
    etching: {
      runeName: "LIQUIDIUM•TOKEN",
    },
  },
  {
    id: "ordinals_ethtoken",
    rune: "ETH•TOKEN",
    name: "ETH•TOKEN",
    imageURI: "https://icon.unisat.io/icon/runes/ETH%E2%80%A2TOKEN",
    etching: {
      runeName: "ETH•TOKEN",
    },
  },
  {
    id: "ordinals_dogtoken",
    rune: "DOG•TOKEN",
    name: "DOG•TOKEN",
    imageURI: "https://icon.unisat.io/icon/runes/DOG%E2%80%A2TOKEN",
    etching: {
      runeName: "DOG•TOKEN",
    },
  },
];

// Cache configuration
const CACHE_CONFIG = {
  EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  REFRESH_ATTEMPT_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours between refresh attempts
  STALE_WHILE_REVALIDATE: 30 * 24 * 60 * 60 * 1000, // Use stale data for up to 30 days
};

export interface CachedPopularRune {
  id: string;
  name: string;
  imageURI?: string;
  rune: string;
  etching?: {
    runeName?: string;
  };
  icon_content_url_data?: string;
  last_updated_at?: string;
}

interface CacheMetadata {
  cachedData: Record<string, unknown>[] | null;
  isExpired: boolean;
  shouldAttemptRefresh: boolean;
  isStale: boolean;
  lastRefreshAttempt: number | null;
}

/**
 * Fetch popular runes from cache with detailed metadata
 * @returns Object containing cached data and metadata about cache status
 */
export async function getCachedPopularRunesWithMetadata(): Promise<CacheMetadata> {
  try {
    // Check for cached popular runes
    const { data } = await supabase
      .from("popular_runes_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().getTime();

    if (!data) {
      return {
        cachedData: FALLBACK_POPULAR_RUNES,
        isExpired: true,
        shouldAttemptRefresh: true,
        isStale: false,
        lastRefreshAttempt: null,
      };
    }

    // Parse timestamps
    const cacheDate = new Date(data.created_at).getTime();
    const lastRefreshAttempt = data.last_refresh_attempt
      ? new Date(data.last_refresh_attempt).getTime()
      : null;

    // Check various cache states
    const isExpired = now - cacheDate > CACHE_CONFIG.EXPIRY;
    const isStale = now - cacheDate > CACHE_CONFIG.STALE_WHILE_REVALIDATE;

    // Only attempt refresh if:
    // 1. Cache is expired AND
    // 2. It's been long enough since last refresh attempt
    const shouldAttemptRefresh =
      isExpired &&
      (!lastRefreshAttempt ||
        now - lastRefreshAttempt > CACHE_CONFIG.REFRESH_ATTEMPT_INTERVAL);

    return {
      cachedData: data.runes_data as Record<string, unknown>[],
      isExpired,
      shouldAttemptRefresh,
      isStale,
      lastRefreshAttempt,
    };
  } catch (error) {
    console.error("Error fetching popular runes cache:", error);
    return {
      cachedData: FALLBACK_POPULAR_RUNES,
      isExpired: true,
      shouldAttemptRefresh: true,
      isStale: false,
      lastRefreshAttempt: null,
    };
  }
}

/**
 * Fetch popular runes from cache
 * @returns Cached popular runes, even if expired (stale-while-revalidate pattern)
 */
export async function getCachedPopularRunesWithExpiry(): Promise<{
  cachedData: Record<string, unknown>[] | null;
  isExpired: boolean;
}> {
  try {
    const { cachedData, isExpired, isStale } =
      await getCachedPopularRunesWithMetadata();

    // If we have no data or it's completely stale, use fallback
    if (!cachedData || isStale) {
      return {
        cachedData: FALLBACK_POPULAR_RUNES,
        isExpired: true,
      };
    }

    return {
      cachedData,
      isExpired,
    };
  } catch {
    return {
      cachedData: FALLBACK_POPULAR_RUNES,
      isExpired: true,
    };
  }
}

/**
 * Fetch popular runes from cache
 * @returns Cached popular runes if present, falling back to defaults
 */
export async function getCachedPopularRunes(): Promise<
  Record<string, unknown>[]
> {
  try {
    const { cachedData } = await getCachedPopularRunesWithExpiry();
    return cachedData || FALLBACK_POPULAR_RUNES;
  } catch {
    return FALLBACK_POPULAR_RUNES;
  }
}

/**
 * Update the last refresh attempt timestamp
 * Used to throttle API calls when the API is failing
 */
export async function updateLastRefreshAttempt(): Promise<void> {
  try {
    // Find the latest cache entry
    const { data } = await supabase
      .from("popular_runes_cache")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      // Update the last_refresh_attempt field
      await supabase
        .from("popular_runes_cache")
        .update({ last_refresh_attempt: new Date().toISOString() })
        .eq("id", data.id);
    }
  } catch (error) {
    console.error("Error updating last refresh attempt:", error);
  }
}

/**
 * Store popular runes in cache
 * @param runesData The popular runes data to cache
 */
export async function cachePopularRunes(
  runesData: Record<string, unknown>[],
): Promise<void> {
  if (!runesData || !Array.isArray(runesData) || runesData.length === 0) {
    console.warn("Not caching empty or invalid popular runes data");
    return;
  }

  try {
    await supabase.from("popular_runes_cache").insert([
      {
        runes_data: runesData,
        created_at: new Date().toISOString(),
        last_refresh_attempt: new Date().toISOString(),
      },
    ]);

    // Operation completed successfully
  } catch (error) {
    console.error("Error caching popular runes:", error);
    // Errors in caching are non-critical
  }
}
