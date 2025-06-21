import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the SatsTerminal client
const mockSearch = jest.fn();
jest.mock('@/lib/serverUtils', () => ({
  getSatsTerminalClient: jest.fn(() => ({
    search: mockSearch,
  })),
}));

describe('/api/sats-terminal/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle GET request successfully', async () => {
    mockSearch.mockResolvedValue([
      {
        id: 'test-id',
        name: 'TEST•RUNE',
        imageURI: 'test-image-uri',
      },
    ]);

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

  it('should generate stable IDs for items without token_id or id', async () => {
    mockSearch.mockResolvedValue([
      {
        token: 'STABLE•RUNE',
        name: 'Stable Rune',
        icon: 'stable-icon.png',
      },
      {
        name: 'Another Rune',
        imageURI: 'another-icon.png',
      },
    ]);

    const request = new NextRequest(
      'http://localhost:3000/api/sats-terminal/search?query=stable&sell=false',
      {
        method: 'GET',
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);

    // Check that stable IDs are generated
    expect(data.data[0].id).toMatch(/^search_[a-f0-9]{8}$/);
    expect(data.data[1].id).toMatch(/^search_[a-f0-9]{8}$/);

    // IDs should be different for different items
    expect(data.data[0].id).not.toBe(data.data[1].id);

    // Make the same request again to verify ID stability
    const secondResponse = await GET(request);
    const secondData = await secondResponse.json();

    // IDs should be identical across requests
    expect(secondData.data[0].id).toBe(data.data[0].id);
    expect(secondData.data[1].id).toBe(data.data[1].id);
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
