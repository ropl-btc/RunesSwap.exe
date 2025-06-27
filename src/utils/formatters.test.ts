import { formatNumberString, truncateTxid } from './formatters';

describe('truncateTxid', () => {
  it('returns empty string for empty input', () => {
    expect(truncateTxid('')).toBe('');
    expect(truncateTxid(undefined as unknown as string)).toBe('');
  });

  it("returns original string if it's shorter than truncation length", () => {
    const shortTxid = 'abc123';
    expect(truncateTxid(shortTxid)).toBe(shortTxid);
  });

  it('truncates long strings correctly with default length', () => {
    const longTxid = 'abcdef1234567890abcdef1234567890';
    expect(truncateTxid(longTxid)).toBe('abcdef12...34567890');
  });

  it('truncates long strings with custom length', () => {
    const longTxid = 'abcdef1234567890abcdef1234567890';
    expect(truncateTxid(longTxid, 4)).toBe('abcd...7890');
  });

  it('returns original when length threshold is met', () => {
    const txid = 'a'.repeat(19); // 2*8 + 3
    expect(truncateTxid(txid)).toBe(txid);
  });
});

describe('formatNumberString', () => {
  it('returns default display for undefined or null', () => {
    expect(formatNumberString(undefined)).toBe('N/A');
    expect(formatNumberString(null)).toBe('N/A');
  });

  it('formats small numbers correctly', () => {
    expect(formatNumberString('123')).toBe('123');
    expect(formatNumberString('1234')).toBe('1,234');
  });

  it('formats large numbers with commas', () => {
    expect(formatNumberString('1234567890')).toBe('1,234,567,890');
  });

  it('handles extremely large numbers without losing precision', () => {
    const bigNum = '12345678901234567890';
    expect(formatNumberString(bigNum)).toBe('12,345,678,901,234,567,890');
  });

  it('returns default display for invalid input', () => {
    expect(formatNumberString('not-a-number')).toBe('N/A');
  });

  it('allows custom default display', () => {
    expect(formatNumberString(undefined, 'none')).toBe('none');
  });

  it('handles zero correctly', () => {
    expect(formatNumberString('0')).toBe('0');
  });

  it('formats decimal and negative numbers', () => {
    expect(formatNumberString('-1234.56')).toBe('-1,234.56');
  });
});
