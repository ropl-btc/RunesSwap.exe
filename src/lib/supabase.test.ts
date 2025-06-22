import { hasSupabase, supabase } from './supabase';

describe('supabase client', () => {
  it('throws when accessed without configuration', () => {
    if (hasSupabase) {
      // If environment variables are set in this environment, skip
      return;
    }

    expect(() => {
      (supabase as unknown as { from: (tableName: string) => void }).from(
        'test',
      );
    }).toThrow();
  });
});
