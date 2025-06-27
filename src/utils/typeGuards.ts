/**
 * Type-safe utility functions for handling potentially undefined values.
 * These functions improve AI readability by making null/undefined handling explicit.
 */

/**
 * Safely access the first element of an array.
 * @param array - The array to access
 * @returns The first element or undefined if array is empty
 */
export function safeArrayFirst<T>(array: T[]): T | undefined {
  return array.length > 0 ? array[0] : undefined;
}

/**
 * Safely access an array element by index.
 * @param array - The array to access
 * @param index - The index to access
 * @returns The element at index or undefined if out of bounds
 */
export function safeArrayAccess<T>(array: T[], index: number): T | undefined {
  return index >= 0 && index < array.length ? array[index] : undefined;
}

/**
 * Assert that a value is not null or undefined.
 * @param value - The value to check
 * @param errorMessage - Error message if value is null/undefined
 * @returns The value with non-null assertion
 */
export function assertDefined<T>(
  value: T | null | undefined,
  errorMessage: string,
): T {
  if (value == null) {
    throw new Error(errorMessage);
  }
  return value;
}

/**
 * Parse JWT payload safely.
 * @param jwt - The JWT string
 * @returns Parsed payload or null if parsing fails
 */
export function safeParseJWT(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    if (!payload) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Type guard to check if a value is not null or undefined.
 * @param value - The value to check
 * @returns True if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Filter out null and undefined values from an array.
 * @param array - Array with potentially null/undefined values
 * @returns Array with only defined values
 */
export function filterDefined<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isDefined);
}

/**
 * Narrow unknown to a plain object record.
 * @param value - The value to check
 * @returns True if value is a non-null object
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
