import { idle, once, retry, withRetry } from "../src/async";

jest.setTimeout(30000);

describe("async", () => {
  test("idle() does not return until specified time has elapsed", async () => {
    const start = Date.now();
    await idle(1000);
    const end = Date.now();
    expect(Math.round((end - start) / 1000)).toBe(1.0);
  });

  test("once() functions are only called once", async () => {
    let count = 0;
    const incrementOnce = once(
      () => new Promise((resolve) => resolve(++count))
    );
    incrementOnce();
    incrementOnce();
    incrementOnce();
    expect(count).toBe(1);
  });

  test("retry() with exponential backoff", async () => {
    const times = [];
    let count = 0;
    let start = Date.now();

    await retry(async () => {
      times.push(Math.round((Date.now() - start) / 1000));
      ++count;
      start = Date.now();
      return null;
    }, 5);

    expect(count).toBe(5);
    expect(times).toEqual([0, 1, 2, 4, 8]);
  });

  test("withRetry() with exponential backoff", async () => {
    const times = [];
    let count = 0;
    let start = Date.now();

    try {
      await withRetry(async () => {
        times.push(Math.round((Date.now() - start) / 1000));
        ++count;
        start = Date.now();
        throw new Error();
      }, 5);
    } catch (_) {
      // ignore
    }

    expect(count).toBe(5);
    expect(times).toEqual([0, 1, 2, 4, 8]);
  });
});
