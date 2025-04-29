import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrdiscanClient } from '@/lib/serverUtils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prefix = searchParams.get('prefix');

    if (!prefix) {
      return NextResponse.json(
        { error: 'Missing required parameter: prefix' },
        { status: 400 }
      );
    }

    // First, try to find the rune in our database by exact ID
    const { data: existingRune, error: dbError } = await supabase
      .from('runes')
      .select('*')
      .eq('id', prefix)
      .limit(1);

    // If not found by exact ID, try to find by prefix
    if (!existingRune || existingRune.length === 0) {
      const { data: prefixRune, error: prefixDbError } = await supabase
        .from('runes')
        .select('*')
        .ilike('id', `${prefix}:%`)
        .limit(1);

      if (prefixDbError) {
        console.error('[DEBUG] Error fetching from DB by prefix:', prefixDbError);
      }

      if (prefixRune && prefixRune.length > 0) {
        return NextResponse.json(prefixRune[0]);
      }
    }

    if (dbError) {
      console.error('[DEBUG] Error fetching from DB by prefix:', dbError);
    }

    if (existingRune && existingRune.length > 0) {
      return NextResponse.json(existingRune[0]);
    }

    // If not found in DB, try to fetch from Ordiscan
    // Since Ordiscan doesn't have a direct endpoint to search by ID,
    // we'll try to find a rune with a matching name pattern
    try {
      console.log(`[DEBUG] Trying to find rune with ID ${prefix} from Ordiscan`);
      const ordiscan = getOrdiscanClient();

      // First, try to get all runes from our database to see if we can find a match
      const { data: allRunes, error: allRunesError } = await supabase
        .from('runes')
        .select('name, id')
        .limit(1000);

      if (allRunesError) {
        console.error('[DEBUG] Error fetching all runes:', allRunesError);
      }

      // Try to find a matching rune by ID pattern
      let matchingRune = null;

      // First try exact match
      matchingRune = allRunes?.find(rune => rune.id === prefix);

      // If no exact match, try prefix match
      if (!matchingRune && prefix.includes(':')) {
        const prefixPart = prefix.split(':')[0];
        matchingRune = allRunes?.find(rune => rune.id.startsWith(prefixPart + ':'));
      }

      if (matchingRune) {
        console.log(`[DEBUG] Found matching rune with name: ${matchingRune.name}`);

        // Fetch the rune data from Ordiscan
        const runeData = await ordiscan.rune.getInfo({ name: matchingRune.name });

        if (runeData) {
          console.log(`[DEBUG] Successfully fetched rune data from Ordiscan`);

          // Store in Supabase for future use
          const dataToInsert = {
            ...runeData,
            last_updated_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('runes')
            .upsert([dataToInsert]);

          if (insertError) {
            console.error('[DEBUG] Error storing rune data:', insertError);
          }

          return NextResponse.json(runeData);
        }
      }
    } catch (ordiscanError) {
      console.error('[DEBUG] Error fetching from Ordiscan:', ordiscanError);
    }

    // If all attempts fail, return not found
    return NextResponse.json(
      { error: 'Rune not found with the given prefix' },
      { status: 404 }
    );
  } catch (error) {
    console.error('[DEBUG] Error in rune-info-by-id API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
