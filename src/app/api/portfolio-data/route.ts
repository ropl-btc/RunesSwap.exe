import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { supabase } from '@/lib/supabase';
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequest } from '@/lib/apiUtils';
import { RuneBalance, RuneMarketInfo } from '@/types/ordiscan';
import { RuneData } from '@/lib/runesData';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  // const { searchParams } = new URL(request.url);
  // const address = searchParams.get('address');

  // Zod validation for 'address'
  const schema = z.object({ address: z.string().min(1) });
  const validation = await validateRequest(request, schema, 'query');
  if (!validation.success) {
    return validation.errorResponse;
  }
  const { address: validAddress } = validation.data;

  try {
    // Fetch balances from Ordiscan (always fresh)
    const ordiscan = getOrdiscanClient();
    const balancesPromise = ordiscan.address.getRunes({ address: validAddress });

    // Wait for balances first since we need the rune names for subsequent queries
    const balances: RuneBalance[] = await balancesPromise;
    const validBalances: RuneBalance[] = Array.isArray(balances) ? balances : [];
    
    if (validBalances.length === 0) {
      return createSuccessResponse({ balances: [], runeInfos: {}, marketData: {} });
    }
    
    // Extract all rune names
    const runeNames = validBalances.map(balance => balance.name);
    
    // Fetch rune info and market data in parallel from Supabase
    const [runeInfoResult, marketDataResult] = await Promise.all([
      // Batch fetch rune info from Supabase
      supabase
        .from('runes')
        .select('*')
        .in('name', runeNames),
      
      // Batch fetch market data from Supabase
      supabase
        .from('rune_market_data')
        .select('*')
        .in('rune_name', runeNames)
        .gt('last_updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    ]);
    
    const runeInfos = runeInfoResult.data;
    const runeInfoError = runeInfoResult.error;
    const marketData = marketDataResult.data;
    const marketError = marketDataResult.error;
    
    if (runeInfoError) {
      console.error('Error fetching rune infos:', runeInfoError);
    }
    
    if (marketError) {
      console.error('Error fetching market data:', marketError);
    }
    
    // Convert array data to maps for easy client-side lookup
    const runeInfoMap: Record<string, RuneData> = {};
    const marketDataMap: Record<string, RuneMarketInfo> = {};
    
    (runeInfos || []).forEach(info => {
      runeInfoMap[info.name] = info as RuneData;
    });
    
    (marketData || []).forEach(market => {
      marketDataMap[market.rune_name] = {
        price_in_sats: market.price_in_sats,
        price_in_usd: market.price_in_usd,
        market_cap_in_btc: market.market_cap_in_btc,
        market_cap_in_usd: market.market_cap_in_usd
      };
    });
    
    // Prepare arrays for missing data
    const missingRuneNames = runeNames.filter(name => !runeInfoMap[name]);
    const missingMarketDataNames = runeNames.filter(name => !marketDataMap[name]);

    // Use lib functions for missing data
    const { getRuneData } = await import('@/lib/runesData');
    const { getRuneMarketData } = await import('@/lib/runeMarketData');

    // Fetch missing rune info
    const missingRuneInfoResults = await Promise.all(
      missingRuneNames.map(runeName => getRuneData(runeName))
    );
    missingRuneNames.forEach((runeName, idx) => {
      const data = missingRuneInfoResults[idx];
      if (data) {
        runeInfoMap[runeName] = data;
      }
    });

    // Fetch missing market data
    const missingMarketDataResults = await Promise.all(
      missingMarketDataNames.map(runeName => getRuneMarketData(runeName))
    );
    missingMarketDataNames.forEach((runeName, idx) => {
      const data = missingMarketDataResults[idx];
      if (data) {
        marketDataMap[runeName] = data;
      }
    });

    // Return the combined data
    return createSuccessResponse({
      balances: validBalances,
      runeInfos: runeInfoMap,
      marketData: marketDataMap
    });
  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to fetch portfolio data for ${validAddress}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 