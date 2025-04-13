import { supabase } from './supabase'

export interface RuneMarketData {
  price_in_sats: number
  price_in_usd: number
  market_cap_in_btc: number
  market_cap_in_usd: number
}

export async function getRuneMarketData(runeName: string): Promise<RuneMarketData | null> {
  try {
    const normalizedName = runeName.replace(/•/g, '')
    
    // First, try to get from Supabase
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    
    const { data: existingMarketData, error: dbError } = await supabase
      .from('rune_market_data')
      .select('*')
      .eq('rune_name', normalizedName)
      .gt('last_updated_at', tenMinutesAgo.toISOString())
      .single()

    if (dbError) {
      console.error('[DEBUG] Error fetching from DB:', dbError)
    }

    if (existingMarketData) {
      return {
        price_in_sats: existingMarketData.price_in_sats,
        price_in_usd: existingMarketData.price_in_usd,
        market_cap_in_btc: existingMarketData.market_cap_in_btc,
        market_cap_in_usd: existingMarketData.market_cap_in_usd
      }
    }

    // If not in DB or data is stale, fetch from Ordiscan
    const response = await fetch(`${process.env.NEXT_PUBLIC_ORDISCAN_API_URL}/v1/rune/${normalizedName}/market`, {
      headers: {
        'Authorization': `Bearer ${process.env.ORDISCAN_API_KEY || ''}`,
      }
    })

    if (!response.ok) {
      console.error('[DEBUG] Ordiscan API error:', response.status, response.statusText)
      throw new Error(`Ordiscan API error: ${response.statusText}`)
    }

    const responseData = await response.json()
    const { data: marketData } = responseData

    if (!marketData) {
      return null
    }

    // Store in Supabase
    const upsertData = {
      rune_name: normalizedName,
      price_in_sats: marketData.price_in_sats,
      price_in_usd: marketData.price_in_usd,
      market_cap_in_btc: marketData.market_cap_in_btc,
      market_cap_in_usd: marketData.market_cap_in_usd,
      last_updated_at: new Date().toISOString()
    }

    const { error: upsertError } = await supabase
      .from('rune_market_data')
      .upsert(upsertData)

    if (upsertError) {
      console.error('[DEBUG] Error storing market data:', upsertError)
      console.error('[DEBUG] Upsert error details:', {
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint
      })
    }

    return marketData as RuneMarketData
  } catch (error) {
    console.error('[DEBUG] Error in getRuneMarketData:', error)
    return null
  }
} 