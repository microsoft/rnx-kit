import { tryInvoke } from "../src/function";

describe("Language > Function", () => {
  test("tryInvoke() returns the result of the function on success", () => {
    const result = tryInvoke(() => {
      return 123;
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual(123);
    expect(result[1]).toBeUndefined();
  });

  test("tryInvoke() returns the thrown error on failure", () => {
    const result = tryInvoke(() => {
      throw new Error("failed");
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toBeUndefined();
    expect(result[1].message).toEqual("failed");
  });
});
