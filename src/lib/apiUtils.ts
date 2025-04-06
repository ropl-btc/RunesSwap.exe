import { NextResponse } from 'next/server';

/**
 * Creates a standardized success response object
 * 
 * @param data - The data to include in the response
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized format
 */
export function createSuccessResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data,
  }, { status });
}

/**
 * Creates a standardized error response object
 * 
 * @param message - Main error message
 * @param details - Optional detailed error information
 * @param status - HTTP status code (default: 500)
 * @returns NextResponse with standardized format
 */
export function createErrorResponse(message: string, details?: string, status = 500): NextResponse {
  console.error(`[API Error] ${message}${details ? `: ${details}` : ''}`);
  
  return NextResponse.json({
    success: false,
    error: {
      message,
      ...(details && { details }),
    }
  }, { status });
}

/**
 * Processes different error types into a standardized format
 * 
 * @param error - The error object to process
 * @param defaultMessage - Fallback message if error type can't be determined
 * @returns Standardized error object with message and status
 */
export function handleApiError(error: unknown, defaultMessage = 'An error occurred'): { message: string, status: number, details?: string } {
  // For standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message || defaultMessage,
      status: 500,
      details: error.stack,
    };
  }
  
  // For errors with HTTP status (like from external APIs)
  if (error && typeof error === 'object') {
    // Check for status property
    if ('status' in error) {
      const status = (error as { status: number }).status;
      
      // Handle common HTTP status codes
      if (status === 404) {
        return { message: 'Resource not found', status: 404 };
      }
      
      if (status === 400) {
        return { 
          message: 'Bad request', 
          status: 400,
          details: 'response' in error ? JSON.stringify((error as Record<string, unknown>).response) : undefined
        };
      }
      
      return { 
        message: defaultMessage, 
        status: status || 500,
        details: JSON.stringify(error)
      };
    }
    
    // If it has a message property
    if ('message' in error) {
      return {
        message: (error as { message: string }).message || defaultMessage,
        status: 500,
        details: JSON.stringify(error)
      };
    }
  }
  
  // Default case for unknown error types
  return {
    message: defaultMessage,
    status: 500,
    details: typeof error === 'string' ? error : JSON.stringify(error)
  };
} 