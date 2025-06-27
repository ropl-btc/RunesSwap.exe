/**
 * Safely convert a string to a number with fallback handling.
 *
 * @param value - The value to convert.
 * @param fallback - The value to return when conversion results in NaN.
 * @returns The numeric value or the provided fallback.
 */
export const safeNumber = (value: string | number, fallback = 0): number => {
  // If the value is already a number, return it (ensure not NaN)
  if (typeof value === 'number') {
    return Number.isNaN(value) ? fallback : value;
  }

  // For strings (or other types cast to string), attempt conversion
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};