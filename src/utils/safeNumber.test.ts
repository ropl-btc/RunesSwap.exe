import { describe, expect, it } from '@jest/globals';

import { safeNumber } from './safeNumber';

describe('safeNumber', () => {
  it('returns numeric value for valid numeric strings', () => {
    expect(safeNumber('42')).toBe(42);
    expect(safeNumber('3.14')).toBeCloseTo(3.14);
  });

  it('returns fallback for invalid numeric strings', () => {
    expect(safeNumber('abc', 7)).toBe(7);
    expect(safeNumber('', 5)).toBe(5);
  });

  it('returns value unchanged for valid numbers', () => {
    expect(safeNumber(100)).toBe(100);
  });

  it('returns fallback for NaN numbers', () => {
    expect(safeNumber(NaN, 9)).toBe(9);
  });
});