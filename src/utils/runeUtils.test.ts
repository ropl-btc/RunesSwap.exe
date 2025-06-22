import { normalizeRuneName } from './runeUtils';

describe('normalizeRuneName', () => {
  it('removes bullet characters', () => {
    const name = 'R\u2022une';
    expect(normalizeRuneName(name)).toBe('Rune');
  });

  it('removes dots', () => {
    const name = 'Ru.ne';
    expect(normalizeRuneName(name)).toBe('Rune');
  });

  it('keeps other characters unchanged', () => {
    const name = 'Rune_Name-123';
    expect(normalizeRuneName(name)).toBe(name);
  });
});
