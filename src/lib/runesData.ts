import { supabase } from './supabase'
import { getOrdiscanClient } from './serverUtils'

export interface RuneData {
  id: string
  name: string
  formatted_name: string | null
  spacers: number | null
  number: number | null
  inscription_id: string | null
  decimals: number | null
  mint_count_cap: string | null
  symbol: string | null
  etching_txid: string | null
  amount_per_mint: string | null
  timestamp_unix: string | null
  premined_supply: string  // Changed to match API response
  mint_start_block: number | null
  mint_end_block: number | null
  current_supply: string | null
  current_mint_count: number | null
}

export async function getRuneData(runeName: string): Promise<RuneData | null> {
  try {
    // First, try to get from Supabase
    const { data: existingRune, error: dbError } = await supabase
      .from('runes')
      .select('*')
      .eq('name', runeName)
      .single()

    if (dbError) {
      // Error handled by continuing to API fetch
    }

    if (existingRune) {
      return existingRune as RuneData
    }

    // If not in DB, fetch from Ordiscan
    const ordiscan = getOrdiscanClient();
    const runeData = await ordiscan.rune.getInfo({ name: runeName });

    if (!runeData) {
      return null
    }

    // Store in Supabase - ensure we're using the correct field names
    const dataToInsert = {
      ...runeData,
      last_updated_at: new Date().toISOString()
    }

    await supabase
      .from('runes')
      .upsert([dataToInsert])
      .select()

    // Insert errors are non-critical - we can still return the data
    // even if caching to DB fails

    return runeData as RuneData
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null
  }
}

// This function is now only used server-side by the API route
// The client should use the updateRuneDataViaApi function from apiClient.ts
export async function updateRuneData(runeName: string): Promise<RuneData | null> {
  try {
    const ordiscan = getOrdiscanClient();
    const runeData = await ordiscan.rune.getInfo({ name: runeName });

    if (!runeData) {
      return null
    }

    // Update in Supabase - ensure we're using the correct field names
    const dataToUpdate = {
      ...runeData,
      last_updated_at: new Date().toISOString()
    }

    await supabase
      .from('runes')
      .upsert([dataToUpdate])
      .select()

    // Update errors are non-critical - we can still return the data
    // even if updating the DB fails

    return runeData as RuneData
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null
  }
}