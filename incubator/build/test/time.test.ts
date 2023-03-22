import { elapsedTime } from "../src/time";

describe("time", () => {
  const now = "1970-01-01T00:00:00Z";

  test("elapsedTime() returns seconds", () => {
    expect(elapsedTime(now, now)).toBe("0s");
    expect(elapsedTime(now, "1970-01-01T00:00:59Z")).toBe("59s");
  });

  test("elapsedTime() returns minutes", () => {
    expect(elapsedTime(now, "1970-01-01T00:01:00Z")).toBe("1m 0s");
    expect(elapsedTime(now, "1970-01-01T00:59:59Z")).toBe("59m 59s");
  });

  test("elapsedTime() returns hours", () => {
    expect(elapsedTime(now, "1970-01-01T01:00:00Z")).toBe("1h 0m 0s");
  });

  test("elapsedTime() returns hours instead of days", () => {
    expect(elapsedTime(now, "1970-01-02T00:00:00Z")).toBe("24h 0m 0s");
  });

  test("elapsedTime() `endTime` parameter defaults to now", () => {
    const nownow = new Date().toUTCString();
    expect(elapsedTime(nownow)).toBe("0s");
  });
});
