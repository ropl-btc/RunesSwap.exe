import React from "react";
import { JSDOM } from "jsdom";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import useRunesSearch from "./useRunesSearch";

jest.mock("@/lib/apiClient", () => ({
  fetchRunesFromApi: jest.fn(),
  fetchPopularFromApi: jest.fn(),
}));

jest.mock("@/store/runesInfoStore", () => ({
  useRunesInfoStore: jest.fn(() => ({
    runeSearchQuery: "",
    setRuneSearchQuery: jest.fn(),
  })),
}));

beforeAll(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  (global as unknown as { window: Window }).window =
    dom.window as unknown as Window;
  (global as unknown as { document: Document }).document = dom.window.document;
});

afterAll(() => {
  (
    global as unknown as { window: Window & { close: () => void } }
  ).window.close();
});

type HookProps = Parameters<typeof useRunesSearch>[0];

function renderHook(props?: HookProps) {
  let result: ReturnType<typeof useRunesSearch>;
  function TestComponent(p: HookProps) {
    result = useRunesSearch(p);
    return null;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(<TestComponent {...(props || {})} />);
  });
  return {
    get result() {
      return result!;
    },
    rerender(newProps?: HookProps) {
      act(() => {
        root.render(<TestComponent {...(newProps || {})} />);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
    },
  };
}

describe("useRunesSearch", () => {
  it("updates when props change", async () => {
    const cachedA = [
      {
        rune: "AAA",
        etching: { runeName: "AAA" },
        icon_content_url_data: "a.png",
      },
    ];
    const cachedB = [
      {
        rune: "BBB",
        etching: { runeName: "BBB" },
        icon_content_url_data: "b.png",
      },
    ];

    const hook = renderHook({ cachedPopularRunes: cachedA });

    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.result.availableRunes.map((r) => r.id)).toEqual([
      "liquidiumtoken",
      "AAA",
    ]);

    hook.rerender({ cachedPopularRunes: cachedB });
    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.result.availableRunes.map((r) => r.id)).toEqual([
      "liquidiumtoken",
      "BBB",
    ]);

    hook.unmount();
  });
});
