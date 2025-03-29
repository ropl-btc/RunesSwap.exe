import { NextRequest, NextResponse } from 'next/server';

// Define local types matching the ones in the lib (or import from shared location)
// Commented out to avoid linter errors - might use later
// interface RunestoneMessage {
//   rune: string;
//   type: 'ETCH' | 'MINT' | 'TRANSFER';
// }

// Commented out to avoid linter errors - might use later
// interface RunicInput {
//   address: string;
//   rune: string | null;
//   rune_amount: string;
// }

// Commented out to avoid linter errors - might use later
// interface RunicOutput {
//   address: string;
//   rune: string | null;
//   rune_amount: string;
// }

// Commented out to avoid linter errors
// const ORDISCAN_API_BASE = 'https://api.ordiscan.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: "Address parameter is required" }, { status: 400 });
  }

  const apiKey = process.env.ORDISCAN_API_KEY;
  if (!apiKey) {
    console.error("[API /rune-activity] Ordiscan API key is not set");
    return NextResponse.json({ error: "Server configuration error: API key missing" }, { status: 500 });
  }

  const apiUrl = `https://api.ordiscan.com/v1/address/${address}/activity/runes`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const responseBody = await apiResponse.text();

    if (!apiResponse.ok) {
      console.error(`[API /rune-activity] Ordiscan API Error (${apiResponse.status}): ${responseBody}`);
      let errorDetails = responseBody;
      try {
        const errorJson = JSON.parse(responseBody);
        errorDetails = errorJson.error || errorJson.message || responseBody;
      } catch { /* Ignore JSON parse error */ }
      return NextResponse.json({ error: "Failed to fetch from Ordiscan", details: errorDetails }, { status: apiResponse.status });
    }

    try {
      const data = JSON.parse(responseBody);
      
      if (data && Array.isArray(data.data)) {
         return NextResponse.json(data.data);
      } else {
         console.error("[API /rune-activity] Unexpected Ordiscan response format. Expected { data: [...] } structure.", data);
         return NextResponse.json([], { status: 200 });
      }
    } catch (parseError) {
      console.error("[API /rune-activity] Error parsing Ordiscan JSON response:", parseError, "Response text:", responseBody);
      return NextResponse.json({ error: "Failed to parse Ordiscan response" }, { status: 500 });
    }

  } catch (error) {
    console.error("[API /rune-activity] Error calling Ordiscan API route:", error);
    return NextResponse.json({ error: "Internal server error calling Ordiscan route" }, { status: 500 });
  }
} 