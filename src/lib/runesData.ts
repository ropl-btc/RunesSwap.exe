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
      console.error('[DEBUG] Error fetching from DB:', dbError)
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

    const { error: insertError } = await supabase
      .from('runes')
      .upsert([dataToInsert])
      .select()

    if (insertError) {
      console.error('[DEBUG] Error storing rune data:', insertError)
      console.error('[DEBUG] Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
    }

    return runeData as RuneData
  } catch (error) {
    console.error('[DEBUG] Error in getRuneData:', error)
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

    const { error: updateError } = await supabase
      .from('runes')
      .upsert(dataToUpdate)
      .eq('name', runeName)
      .select()

    if (updateError) {
      console.error('[DEBUG] Error updating rune data:', updateError)
      console.error('[DEBUG] Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
    }

    return runeData as RuneData
  } catch (error) {
    console.error('[DEBUG] Error in updateRuneData:', error)
    return null
  }
} 