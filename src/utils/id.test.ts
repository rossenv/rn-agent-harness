import { createId } from "./id";

describe("createId", () => {
  it("makes a different id each call, even in the same millisecond", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const ids = new Set(Array.from({ length: 100 }, () => createId()));
    expect(ids.size).toBe(100);
  });
});
