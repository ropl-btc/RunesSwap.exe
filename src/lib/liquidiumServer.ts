export interface LiquidiumFetchResult<T> {
  ok: boolean;
  data?: T;
  message?: string;
  details?: string;
  status: number;
}

export interface LiquidiumRequestOptions extends RequestInit {
  userJwt?: string;
}

const apiUrl = process.env.LIQUIDIUM_API_URL || 'https://alpha.liquidium.wtf';
const apiKey = process.env.LIQUIDIUM_API_KEY;

export async function callLiquidiumApi<T>(
  path: string,
  options: LiquidiumRequestOptions,
  context: string,
): Promise<LiquidiumFetchResult<T>> {
  if (!apiKey) {
    return {
      ok: false,
      message: 'Server configuration error',
      details: 'Missing Liquidium API key',
      status: 500,
    };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...(options.headers as Record<string, string>),
  };
  if (options.userJwt) {
    headers['x-user-token'] = options.userJwt;
  }

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let json: unknown = undefined;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        if (response.ok) {
          return {
            ok: true,
            data: text as unknown as T,
            status: response.status,
          };
        }
        return {
          ok: false,
          message: `${context} returned invalid JSON`,
          details: text.slice(0, 100),
          status: 500,
        };
      }
    }

    if (!response.ok) {
      const errObj = json as Record<string, unknown> | undefined;
      const errMsg =
        (errObj && (errObj.errorMessage as string)) ||
        (errObj && (errObj.error as string)) ||
        response.statusText ||
        'Error';
      return {
        ok: false,
        message: `${context}: ${errMsg}`,
        details: typeof json === 'string' ? json : JSON.stringify(json),
        status: response.status,
      };
    }

    return { ok: true, data: json as T, status: response.status };
  } catch (error) {
    return {
      ok: false,
      message: `${context} failed`,
      details: error instanceof Error ? error.message : String(error),
      status: 500,
    };
  }
}
