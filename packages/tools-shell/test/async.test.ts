import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { idle, once, retry, withRetry } from "../src/async";

describe("async", () => {
  it("idle() does not return until specified time has elapsed", async () => {
    const start = Date.now();
    await idle(1000);
    const end = Date.now();
    equal(end - start >= 1000, true);
  });

  it("once() functions are only called once", () => {
    let count = 0;
    const incrementOnce = once(() => ++count);
    incrementOnce();
    incrementOnce();
    incrementOnce();
    equal(count, 1);
  });

  it("retry() with exponential backoff", async () => {
    const times: number[] = [];
    let start = Date.now();

    await retry(async () => {
      times.push(Date.now() - start);
      start = Date.now();
      return null;
    }, 4);

    equal(times.length, 4);
    equal(times[0] < 100, true);
    equal(times[1] >= 1000 && times[0] < 2000, true);
    equal(times[2] >= 2000 && times[0] < 4000, true);
    equal(times[3] >= 4000 && times[0] < 8000, true);
  });

  it("retry() returns early with result", async () => {
    let count = 0;

    const result = await retry(async () => {
      return ++count === 2 ? "done" : null;
    }, 5);

    equal(count, 2);
    equal(result, "done");
  });

  it("withRetry() with exponential backoff", async () => {
    const times: number[] = [];

    try {
      let start = Date.now();
      await withRetry(async () => {
        times.push(Date.now() - start);
        start = Date.now();
        throw new Error();
      }, 4);
    } catch (_) {
      // ignore
    }

    equal(times.length, 4);
    equal(times[0] < 100, true);
    equal(times[1] >= 1000 && times[0] < 2000, true);
    equal(times[2] >= 2000 && times[0] < 4000, true);
    equal(times[3] >= 4000 && times[0] < 8000, true);
  });

  it("withRetry() returns early with result", async () => {
    let count = 0;

    const result = await withRetry(async () => {
      if (++count === 2) {
        return "done";
      }
      throw new Error();
    }, 5);

    equal(count, 2);
    equal(result, "done");
  });
});
