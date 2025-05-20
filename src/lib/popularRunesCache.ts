import { supabase } from "./supabase";

export interface CachedPopularRune {
  id: string;
  name: string;
  imageURI?: string;
  rune: string;
  etching?: {
    runeName?: string;
  };
  icon_content_url_data?: string;
  last_updated_at: string;
}

/**
 * Fetch popular runes from cache with expiry information
 * @returns Object containing cached data and whether it's expired
 */
export async function getCachedPopularRunesWithExpiry(): Promise<{
  cachedData: Record<string, unknown>[] | null;
  isExpired: boolean;
}> {
  try {
    // Check for cached popular runes
    const { data } = await supabase
      .from("popular_runes_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return { cachedData: null, isExpired: true };
    }

    // Check if the cache is expired (30 days)
    const cacheExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const cacheDate = new Date(data.created_at).getTime();
    const now = new Date().getTime();
    const isExpired = now - cacheDate > cacheExpiry;

    return {
      cachedData: data.runes_data as Record<string, unknown>[],
      isExpired,
    };
  } catch {
    return { cachedData: null, isExpired: true };
  }
}

/**
 * Fetch popular runes from cache
 * @returns Cached popular runes if present and not expired
 */
export async function getCachedPopularRunes(): Promise<
  Record<string, unknown>[] | null
> {
  try {
    const { cachedData, isExpired } = await getCachedPopularRunesWithExpiry();

    // Only return the data if it's not expired
    if (cachedData && !isExpired) {
      return cachedData;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Store popular runes in cache
 * @param runesData The popular runes data to cache
 */
export async function cachePopularRunes(
  runesData: Record<string, unknown>[],
): Promise<void> {
  try {
    await supabase.from("popular_runes_cache").insert([
      {
        runes_data: runesData,
        created_at: new Date().toISOString(),
      },
    ]);

    // Errors in caching are non-critical
  } catch {
    // Errors in caching are non-critical
  }
}
