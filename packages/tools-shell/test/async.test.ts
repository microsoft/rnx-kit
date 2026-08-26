import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { idle, once, retry, withRetry } from "../src/async.ts";

describe("async", () => {
  const mockTimersOpts = { apis: ["Date", "setTimeout"] } as const;

  async function tick(
    t: it.TestContext,
    milliseconds: number,
    increment = 1000
  ) {
    // `tick()` advances the timer but does not execute callbacks until after
    // the specified time, leading to timeouts being executed too late. The
    // workaround is to advance time in increments. Additionally, we need to
    // manually flush the promise queue because this does not happen
    // automatically.
    const iterations = Math.ceil(milliseconds / increment);
    for (let i = 0; i < iterations; ++i) {
      // force flush the promise queue
      await Promise.resolve();
      // force flush the promise queue a second time for chained promises
      await Promise.resolve();
      t.mock.timers.tick(increment);
    }
  }

  it("idle() does not return until specified time has elapsed", async (t) => {
    t.mock.timers.enable(mockTimersOpts);

    const start = Date.now();
    const p = idle(1000).then(() => Date.now() - start);

    await tick(t, 2000);

    equal(await p, 1000);
  });

  it("once() functions are only called once", () => {
    let count = 0;
    const incrementOnce = once(() => ++count);
    incrementOnce();
    incrementOnce();
    incrementOnce();

    equal(count, 1);
  });

  it("retry() with exponential backoff", async (t) => {
    t.mock.timers.enable(mockTimersOpts);

    const retries = 4;
    const times: number[] = [];
    let start = Date.now();

    retry(async () => {
      times.push(Date.now() - start);
      start = Date.now();
      return null;
    }, retries);

    await tick(t, 16000);

    equal(times.length, retries);
    equal(times[0], 0);
    equal(times[1], 1000);
    equal(times[2], 2000);
    equal(times[3], 4000);
  });

  it("retry() returns early with result", async (t) => {
    t.mock.timers.enable(mockTimersOpts);

    let count = 0;

    const result = retry(async () => {
      return ++count === 2 ? "done" : null;
    }, 5);

    await tick(t, 4000);

    equal(count, 2);
    equal(await result, "done");
  });

  it("withRetry() with exponential backoff", async (t) => {
    t.mock.timers.enable(mockTimersOpts);

    const retries = 4;
    const times: number[] = [];

    let start = Date.now();
    withRetry(async () => {
      times.push(Date.now() - start);
      start = Date.now();
      throw new Error();
    }, retries).catch(() => null);

    await tick(t, 16000);

    equal(times.length, retries);
    equal(times[0], 0);
    equal(times[1], 1000);
    equal(times[2], 2000);
    equal(times[3], 4000);
  });

  it("withRetry() returns early with result", async (t) => {
    t.mock.timers.enable(mockTimersOpts);

    let count = 0;

    const result = withRetry(async () => {
      if (++count === 2) {
        return "done";
      }
      throw new Error();
    }, 5);

    await tick(t, 4000);

    equal(count, 2);
    equal(await result, "done");
  });
});
