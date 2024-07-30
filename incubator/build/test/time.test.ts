import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { elapsedTime } from "../src/time";

describe("elapsedTime()", () => {
  const now = "1970-01-01T00:00:00Z";

  it("returns seconds", () => {
    equal(elapsedTime(now, now), "0s");
    equal(elapsedTime(now, "1970-01-01T00:00:59Z"), "59s");
  });

  it("returns minutes", () => {
    equal(elapsedTime(now, "1970-01-01T00:01:00Z"), "1m 0s");
    equal(elapsedTime(now, "1970-01-01T00:59:59Z"), "59m 59s");
  });

  it("returns hours", () => {
    equal(elapsedTime(now, "1970-01-01T01:00:00Z"), "1h 0m 0s");
  });

  it("returns hours instead of days", () => {
    equal(elapsedTime(now, "1970-01-02T00:00:00Z"), "24h 0m 0s");
  });

  it("`endTime` parameter defaults to now", () => {
    const nownow = new Date().toUTCString();
    equal(elapsedTime(nownow), "0s");
  });
});
