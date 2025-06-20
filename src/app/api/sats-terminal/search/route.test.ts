import { NextRequest } from 'next/server';
import { POST } from './route';

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
  it('should handle POST request successfully', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/sats-terminal/search',
      {
        method: 'POST',
        body: JSON.stringify({
          rune_name: 'test',
          sell: false,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
