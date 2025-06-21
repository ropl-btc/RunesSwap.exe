import { NextRequest } from 'next/server';
import { getRuneData } from '@/lib/runesData';
import { GET } from './route';

jest.mock('@/lib/runesData');

describe('rune info route', () => {
  it('returns rune info when found', async () => {
    (getRuneData as jest.Mock).mockResolvedValue({ name: 'BTC' });
    const request = new NextRequest('https://example.com/api?name=BTC');
    const response = await GET(request);
    expect(getRuneData).toHaveBeenCalledWith('BTC');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { name: 'BTC' },
    });
  });

  it('returns 404 success when rune not found', async () => {
    (getRuneData as jest.Mock).mockResolvedValue(null);
    const request = new NextRequest('https://example.com/api?name=UNKNOWN');
    const response = await GET(request);
    expect(getRuneData).toHaveBeenCalledWith('UNKNOWN');
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: null,
    });
  });
});
