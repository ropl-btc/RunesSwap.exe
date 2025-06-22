import {
  assertDefined,
  filterDefined,
  isDefined,
  safeArrayAccess,
  safeArrayFirst,
  safeParseJWT,
} from './typeGuards';

describe('safeArrayFirst', () => {
  it('returns undefined for empty array', () => {
    expect(safeArrayFirst([])).toBeUndefined();
  });

  it('returns the first element when available', () => {
    expect(safeArrayFirst([1, 2, 3])).toBe(1);
  });
});

describe('safeArrayAccess', () => {
  const arr = ['a', 'b', 'c'];

  it('returns undefined for out of bounds index', () => {
    expect(safeArrayAccess(arr, 3)).toBeUndefined();
    expect(safeArrayAccess(arr, -1)).toBeUndefined();
  });

  it('returns the element at the given index', () => {
    expect(safeArrayAccess(arr, 1)).toBe('b');
  });
});

describe('assertDefined', () => {
  it('returns the value when defined', () => {
    expect(assertDefined('hello', 'error')).toBe('hello');
  });

  it('throws an error when value is null or undefined', () => {
    expect(() => assertDefined(null, 'oops')).toThrow('oops');
    expect(() => assertDefined(undefined, 'oops')).toThrow('oops');
  });
});

describe('safeParseJWT', () => {
  // create a simple JWT with payload {"foo":"bar"}
  const header = Buffer.from('{"alg":"none"}').toString('base64');
  const payload = Buffer.from('{"foo":"bar"}').toString('base64');
  const jwt = `${header}.${payload}.signature`;

  it('parses valid JWT payload', () => {
    expect(safeParseJWT(jwt)).toEqual({ foo: 'bar' });
  });

  it('returns null for invalid jwt strings', () => {
    expect(safeParseJWT('invalid.jwt')).toBeNull();
    expect(safeParseJWT('a.b')).toBeNull();
  });
});

describe('isDefined', () => {
  it('detects defined values', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
  });

  it('detects undefined or null values', () => {
    expect(isDefined(undefined)).toBe(false);
    expect(isDefined(null)).toBe(false);
  });
});

describe('filterDefined', () => {
  it('filters out null and undefined values', () => {
    const arr = [1, null, 2, undefined, 3];
    expect(filterDefined(arr)).toEqual([1, 2, 3]);
  });
});
