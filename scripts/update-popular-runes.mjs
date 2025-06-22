#!/usr/bin/env node

/**
 * Script to fetch popular runes from SatsTerminal and update Supabase cache
 * Run with: node scripts/update-popular-runes.js
 */

import { createClient } from '@supabase/supabase-js';
import { SatsTerminalSDK } from 'satsterminal-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function updatePopularRunes() {
  console.log('🚀 Starting popular runes update...');

  // Initialize clients
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const satsTerminalApiKey = process.env.SATS_TERMINAL_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  if (!satsTerminalApiKey) {
    console.error('❌ Missing SatsTerminal API key');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const terminal = new SatsTerminalSDK({
    apiKey: satsTerminalApiKey,
    baseUrl: process.env.TBA_API_URL || 'https://api.sats.terminal',
  });

  try {
    // Fetch popular tokens from SatsTerminal
    console.log('📡 Fetching popular runes from SatsTerminal...');
    const popularResponse = await terminal.popularTokens({});

    if (!popularResponse || !Array.isArray(popularResponse)) {
      console.warn('⚠️  No popular runes data received from SatsTerminal');
      return;
    }

    console.log(`✅ Fetched ${popularResponse.length} popular runes`);

    // Log first few runes for verification
    console.log('📋 Sample runes:');
    popularResponse.slice(0, 3).forEach((rune, index) => {
      // Defensively check if rune exists before accessing properties
      const runeName =
        rune?.etching?.runeName || rune?.rune || 'Unknown Rune Name';
      console.log(`  ${index + 1}. ${runeName}`);
    });

    // Insert into Supabase popular_runes_cache table
    console.log('💾 Updating Supabase cache...');
    const { error } = await supabase.from('popular_runes_cache').insert([
      {
        runes_data: popularResponse,
        created_at: new Date().toISOString(),
        last_refresh_attempt: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('❌ Error updating Supabase:', error);
      process.exit(1);
    }

    console.log('✅ Successfully updated popular runes cache!');
    console.log(`📊 Total runes cached: ${popularResponse.length}`);

    // Clean up old cache entries (keep only the latest 5)
    console.log('🧹 Cleaning up old cache entries...');
    const { data: allEntries, error: selectError } = await supabase
      .from('popular_runes_cache')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (selectError) {
      console.warn(
        '⚠️  Warning: Could not fetch old cache entries for cleanup:',
        selectError,
      );
    } else if (allEntries && allEntries.length > 5) {
      const entriesToDelete = allEntries.slice(5);
      const idsToDelete = entriesToDelete.map((entry) => entry.id);

      const { error: deleteError } = await supabase
        .from('popular_runes_cache')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.warn(
          '⚠️  Warning: Could not clean up old entries:',
          deleteError,
        );
      } else {
        console.log(
          `🗑️  Cleaned up ${entriesToDelete.length} old cache entries`,
        );
      }
    }
  } catch (error) {
    console.error('❌ Error updating popular runes:', error);
    process.exit(1);
  }
}

// Run the script
updatePopularRunes()
  .then(() => {
    console.log('🎉 Popular runes update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
