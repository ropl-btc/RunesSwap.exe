import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the SatsTerminal client
jest.mock('@/lib/serverUtils', () => ({
  getSatsTerminalClient: jest.fn(() => ({
    search: jest.fn().mockResolvedValue([
      {
        id: 'test-id',
        name: 'TEST•RUNE',
        imageURI: 'test-image-uri',
      },
    ]),
  })),
}));

describe('/api/sats-terminal/search', () => {
  it('should handle GET request successfully', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/sats-terminal/search?query=test&sell=false',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      success: true,
      data: [
        {
          id: 'test-id',
          name: 'TEST•RUNE',
          imageURI: 'test-image-uri',
        },
      ],
    });
  });

  it('should handle missing query parameter', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/sats-terminal/search',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.message).toBe('Invalid request parameters');
  });
});
