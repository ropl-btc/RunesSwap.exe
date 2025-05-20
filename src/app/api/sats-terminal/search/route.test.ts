import { GET } from "./route";
import { NextRequest } from "next/server";
import { getSatsTerminalClient } from "@/lib/serverUtils";

jest.mock("@/lib/serverUtils");

describe("search route", () => {
  it("coerces sell query string to boolean", async () => {
    const mockSearch = jest.fn().mockResolvedValue([]);
    (getSatsTerminalClient as jest.Mock).mockReturnValue({
      search: mockSearch,
    });

    const request = new NextRequest(
      "https://example.com/api?sell=true&query=test",
    );
    const response = await GET(request);

    expect(mockSearch).toHaveBeenCalledWith({ rune_name: "test", sell: true });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: [] });
  });
});
