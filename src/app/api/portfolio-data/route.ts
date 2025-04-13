import { NextRequest } from 'next/server';
import { getOrdiscanClient } from '@/lib/serverUtils';
import { supabase } from '@/lib/supabase';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';
import { RuneBalance, RuneMarketInfo } from '@/types/ordiscan';
import { RuneData } from '@/lib/runesData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return createErrorResponse('Address parameter is required', undefined, 400);
  }

  try {
    // Fetch balances from Ordiscan (always fresh)
    const ordiscan = getOrdiscanClient();
    const balancesPromise = ordiscan.address.getRunes({ address });

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
    
    // Create promise arrays for missing data
    const missingRuneInfoPromises = missingRuneNames.map(runeName => 
      fetch(`${process.env.NEXT_PUBLIC_ORDISCAN_API_URL}/v1/rune/${runeName}`, {
        headers: { 'Authorization': `Bearer ${process.env.ORDISCAN_API_KEY || ''}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data?.data) {
          // Store in Supabase for future use
          const runeData = {
            ...data.data,
            last_updated_at: new Date().toISOString()
          };
          
          runeInfoMap[runeName] = runeData as RuneData;
          
          // Don't await this, just fire and forget
          supabase.from('runes').insert([runeData]);
        }
        return data?.data;
      })
      .catch(err => {
        console.error(`Error fetching rune info for ${runeName}:`, err);
        return null;
      })
    );
    
    const missingMarketDataPromises = missingMarketDataNames.map(runeName =>
      fetch(`${process.env.NEXT_PUBLIC_ORDISCAN_API_URL}/v1/rune/${runeName}/market`, {
        headers: { 'Authorization': `Bearer ${process.env.ORDISCAN_API_KEY || ''}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data?.data) {
          // Store in Supabase for future use
          const marketInfo = {
            rune_name: runeName,
            price_in_sats: data.data.price_in_sats,
            price_in_usd: data.data.price_in_usd,
            market_cap_in_btc: data.data.market_cap_in_btc,
            market_cap_in_usd: data.data.market_cap_in_usd,
            last_updated_at: new Date().toISOString()
          };
          
          marketDataMap[runeName] = {
            price_in_sats: data.data.price_in_sats,
            price_in_usd: data.data.price_in_usd,
            market_cap_in_btc: data.data.market_cap_in_btc,
            market_cap_in_usd: data.data.market_cap_in_usd
          };
          
          // Don't await this, just fire and forget
          supabase.from('rune_market_data').upsert(marketInfo);
        }
        return data?.data;
      })
      .catch(err => {
        console.error(`Error fetching market data for ${runeName}:`, err);
        return null;
      })
    );
    
    // Wait for all missing data to be fetched in parallel
    if (missingRuneInfoPromises.length > 0 || missingMarketDataPromises.length > 0) {
      await Promise.all([
        Promise.all(missingRuneInfoPromises),
        Promise.all(missingMarketDataPromises)
      ]);
    }
    
    // Return the combined data
    return createSuccessResponse({
      balances: validBalances,
      runeInfos: runeInfoMap,
      marketData: marketDataMap
    });
  } catch (error) {
    const errorInfo = handleApiError(error, `Failed to fetch portfolio data for ${address}`);
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 