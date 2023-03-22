import { latestVersion } from "../src/version";

describe("latestVersion", () => {
  test("returns 0.0.0 if no versions are passed", () => {
    expect(latestVersion([])).toBe("0.0.0");
  });

  test("returns latest version", () => {
    expect(latestVersion(["0.0.1", "0.0.2", "0.0.10"])).toBe("0.0.10");
    expect(latestVersion(["0.0.10", "0.0.2", "0.0.1"])).toBe("0.0.10");
  });
});
