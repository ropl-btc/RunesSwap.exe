import { useRunesInfoStore } from "./runesInfoStore";

describe("runesInfoStore", () => {
  it("updates selected rune info", () => {
    const info: { name: string } = { name: "BTC" };
    useRunesInfoStore.getState().setSelectedRuneInfo(info);
    expect(useRunesInfoStore.getState().selectedRuneInfo).toBe(info);
  });

  it("updates search query", () => {
    useRunesInfoStore.getState().setRuneSearchQuery("test");
    expect(useRunesInfoStore.getState().runeSearchQuery).toBe("test");
  });
});
