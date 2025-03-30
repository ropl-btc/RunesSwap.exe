import {
    type RuneBalance as OrdiscanRuneBalance,
    type RuneInfo as OrdiscanRuneInfo,
    type RuneMarketInfo as OrdiscanRuneMarketInfo,
    type RuneActivityEvent,
} from '@/types/ordiscan';
import type { Rune } from '@/types/satsTerminal';
import { type QuoteResponse, type GetPSBTParams, type ConfirmPSBTParams } from 'satsterminal-sdk';

// Fetch Runes search results from API
export const fetchRunesFromApi = async (query: string): Promise<Rune[]> => {
    if (!query) return [];
    const response = await fetch(`/api/sats-terminal/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Network response was not ok: ${response.statusText}`);
    }
    return response.json();
};

// Fetch Popular Collections from API
export const fetchPopularFromApi = async (): Promise<Record<string, unknown>[]> => {
    const response = await fetch(`/api/sats-terminal/popular`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Network response was not ok: ${response.statusText}`);
    }
    return response.json();
};

// Fetch Quote from API
export const fetchQuoteFromApi = async (params: Record<string, unknown>): Promise<QuoteResponse> => {
    const response = await fetch('/api/sats-terminal/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || `Network response was not ok: ${response.statusText}`);
    }
    return data;
};

// Get PSBT from API
export const getPsbtFromApi = async (params: GetPSBTParams): Promise<Record<string, unknown>> => {
    const response = await fetch('/api/sats-terminal/psbt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || `Network response was not ok: ${response.statusText}`);
    }
    return data;
};

// Confirm PSBT via API
export const confirmPsbtViaApi = async (params: ConfirmPSBTParams): Promise<Record<string, unknown>> => {
    const response = await fetch('/api/sats-terminal/psbt/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!response.ok) {
        // Handle specific status code for expired quote if needed
        if (response.status === 410) {
            const error = new Error(data.details || data.error || 'Quote expired.');
            ((error as unknown) as { code: string }).code = 'QUOTE_EXPIRED'; // Add custom code with proper type casting
            throw error;
        }
        throw new Error(data.details || data.error || `Network response was not ok: ${response.statusText}`);
    }
    return data;
};

// Fetch BTC Balance from API
export const fetchBtcBalanceFromApi = async (address: string): Promise<number> => {
    const response = await fetch(`/api/ordiscan/btc-balance?address=${encodeURIComponent(address)}`);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || `Failed to fetch BTC balance: ${response.statusText}`);
    }
    return data.balance; // Assuming the API returns { balance: number }
};

// Fetch Rune Balances from API
export const fetchRuneBalancesFromApi = async (address: string): Promise<OrdiscanRuneBalance[]> => {
    const response = await fetch(`/api/ordiscan/rune-balances?address=${encodeURIComponent(address)}`);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || `Failed to fetch Rune balances: ${response.statusText}`);
    }
    return data; // Assuming the API returns OrdiscanRuneBalance[]
};

// Fetch Rune Info from API
export const fetchRuneInfoFromApi = async (name: string): Promise<OrdiscanRuneInfo | null> => {
    if (!name) return null; // Don't fetch if name is empty
    const formattedName = name.replace(/•/g, '');
    const response = await fetch(`/api/ordiscan/rune-info?name=${encodeURIComponent(formattedName)}`);
    if (response.status === 404) {
        return null; // API returns null for 404
    }
    const data = await response.json();
    if (!response.ok) {
        // Use error details from API response if available
        throw new Error(data?.details || data?.error || `Failed to fetch Rune info: ${response.statusText}`);
    }
    return data; // Assuming the API returns OrdiscanRuneInfo or null
};

// Fetch Rune Market Info from API
export const fetchRuneMarketFromApi = async (name: string): Promise<OrdiscanRuneMarketInfo | null> => {
    const formattedName = name.replace(/•/g, '');
    const response = await fetch(`/api/ordiscan/rune-market?name=${encodeURIComponent(formattedName)}`);
    if (response.status === 404) {
        return null; // API returns null for 404
    }
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || `Failed to fetch Rune market info: ${response.statusText}`);
    }
    return data;
};

// Fetch List Runes from API
export const fetchListRunesFromApi = async (): Promise<OrdiscanRuneInfo[]> => {
    const response = await fetch(`/api/ordiscan/list-runes`);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || `Failed to fetch runes list: ${response.statusText}`);
    }
    return data; // Assuming the API returns OrdiscanRuneInfo[]
};

// Fetch Rune Activity from API
export const fetchRuneActivityFromApi = async (address: string): Promise<RuneActivityEvent[]> => {
    const response = await fetch(`/api/ordiscan/rune-activity?address=${encodeURIComponent(address)}`);
    let data;
    try {
        data = await response.json();
    } catch (e) {
        console.error("[Client] Failed to parse API response as JSON:", e);
        if (!response.ok) {
           throw new Error(`Failed to fetch rune activity: Server responded with status ${response.status}`);
        }
        throw new Error("Failed to parse successful API response.");
    }

    if (!response.ok) {
        console.error("[Client] API returned error:", data);
        throw new Error(data?.details || data?.error || `Failed to fetch rune activity: ${response.statusText}`);
    }

    if (!Array.isArray(data)) {
        console.error("[Client] API response was OK, but data is not an array:", data);
        throw new Error("Received unexpected data format from API.");
    }
    return data;
}; 