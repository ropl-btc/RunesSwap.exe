import { supabase } from './supabase';

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
 * Fetch popular runes from cache
 * @returns Cached popular runes if present and not expired
 */
export async function getCachedPopularRunes(): Promise<Record<string, unknown>[] | null> {
  try {
    // Check for cached popular runes
    const { data, error } = await supabase
      .from('popular_runes_cache')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    // Check if the cache is expired (30 days)
    const cacheExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const cacheDate = new Date(data.created_at).getTime();
    const now = new Date().getTime();

    if (now - cacheDate > cacheExpiry) {
      return null;
    }

    return data.runes_data as Record<string, unknown>[];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null;
  }
}

/**
 * Store popular runes in cache
 * @param runesData The popular runes data to cache
 */
export async function cachePopularRunes(runesData: Record<string, unknown>[]): Promise<void> {
  try {
    await supabase
      .from('popular_runes_cache')
      .insert([
        {
          runes_data: runesData,
          created_at: new Date().toISOString()
        }
      ]);

    // Errors in caching are non-critical
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Errors in caching are non-critical
  }
}