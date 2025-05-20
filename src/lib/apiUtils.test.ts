import {
  handleApiError,
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from "./apiUtils";
import { NextResponse } from "next/server";
import { z } from "zod";

// Mock NextResponse.json
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      data,
      options,
    })),
  },
}));

describe("handleApiError", () => {
  it("handles Error object", () => {
    const error = new Error("Something went wrong");
    const result = handleApiError(error);
    expect(result.message).toBe("Something went wrong");
    expect(result.status).toBe(500);
    expect(result.details).toContain("Error: Something went wrong");
  });

  it("handles string error", () => {
    const result = handleApiError("A string error");
    expect(result.message).toBe("An error occurred");
    expect(result.status).toBe(500);
    expect(result.details).toBe("A string error");
  });

  it("handles object with message property", () => {
    const error = { message: "Custom error message" };
    const result = handleApiError(error);
    expect(result.message).toBe("Custom error message");
    expect(result.status).toBe(500);
    expect(result.details).toContain("Custom error message");
  });

  it("handles unknown type (number)", () => {
    const result = handleApiError(42);
    expect(result.message).toBe("An error occurred");
    expect(result.status).toBe(500);
    expect(result.details).toBe("42");
  });
});

describe("createSuccessResponse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a success response with default status", () => {
    const data = { key: "value" };
    createSuccessResponse(data);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { success: true, data },
      { status: 200 },
    );
  });

  it("creates a success response with custom status", () => {
    const data = { key: "value" };
    const status = 201;
    createSuccessResponse(data, status);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { success: true, data },
      { status },
    );
  });
});

describe("createErrorResponse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to prevent test output pollution
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates an error response with default status", () => {
    const message = "Error message";
    createErrorResponse(message);

    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        success: false,
        error: { message },
      },
      { status: 500 },
    );
  });

  it("creates an error response with details", () => {
    const message = "Error message";
    const details = "Error details";
    createErrorResponse(message, details);

    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        success: false,
        error: { message, details },
      },
      { status: 500 },
    );
  });

  it("creates an error response with custom status", () => {
    const message = "Error message";
    const details = "Error details";
    const status = 400;
    createErrorResponse(message, details, status);

    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        success: false,
        error: { message, details },
      },
      { status },
    );
  });

  it("logs error to console", () => {
    const message = "Error message";
    createErrorResponse(message);

    expect(console.error).toHaveBeenCalledWith("[API Error] Error message");
  });
});

describe("validateRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it("validates body data successfully", async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ name: "John", age: 30 }),
    } as unknown as Request;

    const result = await validateRequest(mockRequest, schema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "John", age: 30 });
    }
  });

  it("validates query data successfully", async () => {
    // Create a schema that accepts string for age
    const querySchema = z.object({
      name: z.string(),
      age: z.coerce.number(), // Coerce string to number
    });

    const mockUrl = new URL("https://example.com?name=John&age=30");
    const mockRequest = {
      url: mockUrl.toString(),
    } as unknown as Request;

    const result = await validateRequest(mockRequest, querySchema, "query");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "John", age: 30 }); // Age is coerced to number
    }
  });

  it("handles invalid JSON body", async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
    } as unknown as Request;

    const result = await validateRequest(mockRequest, schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: {
            message: "Invalid request",
            details: "The request body could not be parsed as JSON",
          },
        },
        { status: 400 },
      );
    }
  });

  it("handles validation errors for body", async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ name: "John", age: "thirty" }), // age should be a number
    } as unknown as Request;

    const result = await validateRequest(mockRequest, schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "Invalid request parameters",
          }),
        }),
        { status: 400 },
      );
    }
  });
});
