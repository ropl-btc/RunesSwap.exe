import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOrdiscanClient } from "@/lib/serverUtils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prefix = searchParams.get("prefix");

    if (!prefix) {
      return createErrorResponse(
        "Missing required parameter: prefix",
        undefined,
        400,
      );
    }

    // First, try to find the rune in our database by exact ID
    const { data: existingRune, error: dbError } = await supabase
      .from("runes")
      .select("*")
      .eq("id", prefix)
      .limit(1);

    // If not found by exact ID, try to find by prefix
    if (!existingRune || existingRune.length === 0) {
      const { data: prefixRune, error: prefixDbError } = await supabase
        .from("runes")
        .select("*")
        .ilike("id", `${prefix}:%`)
        .limit(1);

      if (prefixDbError) {
        // Error handled by returning not found
      }

      if (prefixRune && prefixRune.length > 0) {
        return createSuccessResponse(prefixRune[0]);
      }
    }

    if (dbError) {
      // Error handled by continuing to next lookup method
    }

    if (existingRune && existingRune.length > 0) {
      return createSuccessResponse(existingRune[0]);
    }

    // If not found in DB, try to fetch from Ordiscan
    // Since Ordiscan doesn't have a direct endpoint to search by ID,
    // we'll try to find a rune with a matching name pattern
    try {
      const ordiscan = getOrdiscanClient();

      // First, try to get all runes from our database to see if we can find a match
      const { data: allRunes, error: allRunesError } = await supabase
        .from("runes")
        .select("name, id")
        .limit(1000);

      if (allRunesError) {
        // Error handled by continuing with empty array
      }

      // Try to find a matching rune by ID pattern
      let matchingRune = null;

      // First try exact match
      matchingRune = allRunes?.find((rune) => rune.id === prefix);

      // If no exact match, try prefix match
      if (!matchingRune && prefix.includes(":")) {
        const prefixPart = prefix.split(":")[0];
        matchingRune = allRunes?.find((rune) =>
          rune.id.startsWith(prefixPart + ":"),
        );
      }

      if (matchingRune) {
        // Fetch the rune data from Ordiscan
        const runeData = await ordiscan.rune.getInfo({
          name: matchingRune.name,
        });

        if (runeData) {
          // Store in Supabase for future use
          const dataToInsert = {
            ...runeData,
            last_updated_at: new Date().toISOString(),
          };

          await supabase.from("runes").upsert([dataToInsert]);

          return createSuccessResponse(runeData);
        }
      }
    } catch {
      // Error handled by returning not found
    }

    // If all attempts fail, return not found
    return createErrorResponse(
      "Rune not found with the given prefix",
      undefined,
      404,
    );
  } catch {
    return createErrorResponse("Internal server error", undefined, 500);
  }
}
