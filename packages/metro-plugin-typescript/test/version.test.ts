import { greaterThanOrEqualTo } from "../src/version";

describe("greaterThanOrEqualTo()", () => {
  it("handles basic comparison", () => {
    expect(greaterThanOrEqualTo("0.66.0", "0.66.1")).toBe(false);
    expect(greaterThanOrEqualTo("0.66.1", "0.66.1")).toBe(true);
    expect(greaterThanOrEqualTo("0.66.2", "0.66.1")).toBe(true);
    expect(greaterThanOrEqualTo("4.7.0", "4.7.0")).toBe(true);
  });

  it("handles prereleases correctly", () => {
    expect(greaterThanOrEqualTo("5.0.0-beta", "4.7.0")).toBe(true);
    expect(greaterThanOrEqualTo("5.0.0-rc.0", "4.7.0")).toBe(true);
    expect(greaterThanOrEqualTo("5.0.0-rc.0", "5.0.0")).toBe(true);
  });
});
