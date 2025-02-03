const fakeMethod = (input: string): string => input;

describe("FakeMethod", () => {
  it("should return a string", () => {
    expect(fakeMethod("Hello World!")).toBe("Hello World!");
  });
});
