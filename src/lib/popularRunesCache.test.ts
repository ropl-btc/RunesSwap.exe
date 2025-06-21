import { getCachedPopularRunesWithMetadata } from './popularRunesCache';

type SupabaseMock = {
  from: jest.Mock;
  select: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
};

jest.mock('./supabase', () => {
  const mock = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null }),
  } as unknown as SupabaseMock;
  return { supabase: mock };
});

describe('getCachedPopularRunesWithMetadata', () => {
  it('returns fallback data when cache is empty', async () => {
    const result = await getCachedPopularRunesWithMetadata();
    expect(result.cachedData).toBeDefined();
    expect(Array.isArray(result.cachedData)).toBe(true);
    expect(result.isExpired).toBe(true);
  });
});
