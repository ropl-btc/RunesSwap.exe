import { getSatsTerminalClient } from '@/lib/serverUtils';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/apiUtils';

export async function GET() {
  try {
    const terminal = getSatsTerminalClient();
    const popularResponse = await terminal.popularCollections({});
    
    // Validate response structure
    if (!popularResponse || typeof popularResponse !== 'object') {
      return createErrorResponse('Invalid response from SatsTerminal', 'Popular collections data is malformed', 500);
    }
    
    return createSuccessResponse(popularResponse);
  } catch (error) {
    const errorInfo = handleApiError(error, 'Failed to fetch popular collections');
    return createErrorResponse(errorInfo.message, errorInfo.details, errorInfo.status);
  }
} 