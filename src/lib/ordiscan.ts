import { Ordiscan } from 'ordiscan';
import type { Utxo as OrdiscanUtxo, RuneBalance as OrdiscanRuneBalance } from 'ordiscan'; // Import types from the package

const ORDISCAN_API_BASE = 'https://api.ordiscan.com';
const API_KEY = process.env.NEXT_PUBLIC_ORDISCAN_API_KEY;

if (!API_KEY) {
  console.warn("Ordiscan API key not found. Please set NEXT_PUBLIC_ORDISCAN_API_KEY environment variable.");
}

// Initialize Ordiscan client
// We handle the missing API key check within each function to allow initialization
const ordiscan = new Ordiscan(API_KEY || '');

/**
 * Fetches all UTXOs for a given Bitcoin address and calculates the total BTC balance.
 * Uses the Ordiscan SDK.
 * @param address - The Bitcoin address (usually paymentAddress).
 * @returns The total balance in satoshis.
 */
export const getBtcBalance = async (address: string): Promise<number> => {
  if (!address) {
    console.warn("[Ordiscan SDK] Address is required to fetch BTC balance.");
    return 0; // Return 0 if no address
  }
  if (!API_KEY) {
    console.error("[Ordiscan SDK] API key is missing. Cannot fetch BTC balance.");
    throw new Error("Ordiscan API key is missing."); // Throw to indicate failure
  }

  try {
    const utxos: OrdiscanUtxo[] = await ordiscan.address.getUtxos({ address });

    // Check if the response is an array
    if (!Array.isArray(utxos)) {
       console.warn(`[Ordiscan SDK] Invalid or empty UTXO data received for address ${address}. Expected array, got:`, utxos);
       return 0;
    }

    // Sum the value of all UTXOs, adding explicit types for reduce
    const totalBalance = utxos.reduce((sum: number, utxo: OrdiscanUtxo) => sum + (utxo.value || 0), 0);
    return totalBalance;
  } catch (error) {
    console.error(`[Ordiscan SDK] Error fetching UTXOs for ${address}:`, error);
    // Consider how to handle errors - throw or return 0/null?
    // Throwing is often better for useQuery to handle error states.
    throw error; 
  }
};

// Re-export the RuneBalance type from the SDK for consistency if needed elsewhere
export type RuneBalance = OrdiscanRuneBalance;

/**
 * Fetches all Rune balances for a given Bitcoin address.
 * Uses the Ordiscan SDK.
 * @param address - The Bitcoin address (usually Ordinals address/taproot).
 * @returns An array of Rune balances.
 */
export const getRuneBalances = async (address: string): Promise<RuneBalance[]> => {
   if (!address) {
    console.warn("[Ordiscan SDK] Address is required to fetch Rune balances.");
    return []; // Return empty array if no address
  }
   if (!API_KEY) {
    console.error("[Ordiscan SDK] API key is missing. Cannot fetch Rune balances.");
    throw new Error("Ordiscan API key is missing."); // Throw to indicate failure
  }

  try {
    // Use ordiscan.address.getRunes based on API structure
    const balances: RuneBalance[] = await ordiscan.address.getRunes({ address });

    // Check if the response is an array, otherwise return empty array
    const validBalances = Array.isArray(balances) ? balances : [];
    return validBalances;
  } catch (error) {
    console.error(`[Ordiscan SDK] Error fetching Rune balances for ${address}:`, error);
    throw error; // Re-throw for useQuery handling
  }
};

// Define local RuneInfo type based on Ordiscan docs for GET /v1/rune/{name}
export interface RuneInfo {
  id: string;
  name: string;
  formatted_name: string;
  number: number;
  inscription_id: string | null;
  decimals: number; // <-- The crucial field
  symbol: string | null; // Allow null based on linter error
  etching_txid: string | null;
  timestamp_unix: string | null;
  premined_supply: string;
  amount_per_mint: string | null;
  mint_count_cap: string | null;
  mint_start_block: number | null;
  mint_end_block: number | null;
  current_supply?: string; // Make optional based on linter error
  current_mint_count?: number; // Make optional based on linter error
  // Add other fields from docs if needed
}

/**
 * Fetches detailed information for a specific Rune, including decimals.
 * Uses the Ordiscan SDK.
 * @param name - The unique name of the rune (without spacers).
 * @returns The Rune information object, or null if not found.
 */
export const getRuneInfo = async (name: string): Promise<RuneInfo | null> => {
  if (!name) {
    console.warn("[Ordiscan SDK] Rune name is required to fetch rune info.");
    return null;
  }
  if (!API_KEY) {
    console.error("[Ordiscan SDK] API key is missing. Cannot fetch rune info.");
    throw new Error("Ordiscan API key is missing.");
  }

  // Ensure name doesn't have spacers for the API call
  const formattedName = name.replace(/•/g, '');

  try {
    // Assuming the method is getInfo and it returns an object matching our RuneInfo interface
    const info: RuneInfo = await ordiscan.rune.getInfo({ name: formattedName });
    return info;
  } catch (error: unknown) {
    // Ordiscan might throw 404 as an error, check for that
    // Perform type check for error properties
    let status = 0;
    if (error && typeof error === 'object' && 'status' in error) {
        status = (error as { status: number }).status;
    }
    if (status === 404) {
        console.warn(`[Ordiscan SDK] Rune info not found for ${formattedName}.`);
        return null; // Return null specifically for 404
    }
    console.error(`[Ordiscan SDK] Error fetching info for rune ${formattedName}:`, error);
    // Re-throw other errors for useQuery handling
    // Need to re-throw the original error or a new Error object
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`An unknown error occurred: ${error}`);
    }
  }
};

// Optional: Define RuneBalance type if not already defined elsewhere
// export interface RuneBalance {
//   name: string;
//   balance: string;
// }

// --- New Function: List Runes ---

/**
 * Fetches a list of the latest runes.
 * Uses the Ordiscan SDK.
 * @returns An array of Rune information objects.
 */
export const getListRunes = async (): Promise<RuneInfo[]> => {
  if (!API_KEY) {
    console.error("[Ordiscan SDK] API key is missing. Cannot list runes.");
    throw new Error("Ordiscan API key is missing.");
  }

  try {
    // Assuming the method is listRunes or similar based on GET /v1/runes
    // The Ordiscan SDK might return the RuneInfo structure directly here.
    // Need to confirm SDK method name. Let's try `list` under `rune`.
    const runes: RuneInfo[] = await ordiscan.rune.list({ sort: 'newest' }); // Fetch newest first
    return Array.isArray(runes) ? runes : [];
  } catch (error) {
    console.error(`[Ordiscan SDK] Error fetching latest runes list:`, error);
    throw error; // Re-throw for useQuery handling
  }
};

// --- New Types for Address Rune Activity ---
export interface RunestoneMessage {
  rune: string;
  type: 'ETCH' | 'MINT' | 'TRANSFER';
}

interface RunicInput {
  address: string;
  output: string; // txid:vout
  rune: string;
  rune_amount: string;
}

interface RunicOutput {
  address: string;
  vout: number;
  rune: string;
  rune_amount: string;
}

export interface RuneActivityEvent {
  txid: string;
  runestone_messages: RunestoneMessage[];
  inputs: RunicInput[];
  outputs: RunicOutput[];
  timestamp: string; // ISO datetime string
}

// --- New Function: Get Address Rune Activity ---

/**
 * Fetches all runic transaction activity for a specific Bitcoin address.
 * Uses the Ordiscan API directly as the SDK might not support this yet.
 * @param address - The Bitcoin address (usually Ordinals/Taproot address).
 * @param page - Optional page number for pagination.
 * @param sort - Optional sort order ('newest' or 'oldest').
 * @returns An array of Rune activity events.
 */
export const getAddressRuneActivity = async (
  address: string,
  page?: number,
  sort: 'newest' | 'oldest' = 'newest'
): Promise<RuneActivityEvent[]> => {
  if (!address) {
    console.warn("[Ordiscan API] Address is required to fetch rune activity.");
    return [];
  }
  if (!API_KEY) {
    console.error("[Ordiscan API] API key is missing. Cannot fetch rune activity.");
    throw new Error("Ordiscan API key is missing.");
  }

  const url = new URL(`${ORDISCAN_API_BASE}/v1/address/${address}/activity/runes`);
  url.searchParams.append('sort', sort);
  if (page) {
    url.searchParams.append('page', page.toString());
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Ordiscan API] Error fetching rune activity (${response.status}): ${errorBody}`);
      throw new Error(`Failed to fetch rune activity: ${response.statusText}`);
    }

    const result = await response.json();
    
    // The data is nested under a 'data' key in the response example
    const activityData: RuneActivityEvent[] = result?.data ?? [];

    if (!Array.isArray(activityData)) {
      console.warn(`[Ordiscan API] Unexpected response format for rune activity. Expected data array.`, result);
      return []; // Return empty array if data format is wrong
    }

    return activityData;

  } catch (error) {
    console.error(`[Ordiscan API] Error fetching rune activity for ${address}:`, error);
    throw error; // Re-throw for useQuery handling
  }
}; 