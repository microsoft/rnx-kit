import { idle, once, retry, withRetry } from "../src/async";

describe("async", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("idle() does not return until specified time has elapsed", async () => {
    const start = Date.now();
    idle(1000);

    await jest.runAllTimersAsync();

    expect(Date.now() - start).toBe(1000);
  });

  it("once() functions are only called once", () => {
    let count = 0;
    const incrementOnce = once(() => ++count);
    incrementOnce();
    incrementOnce();
    incrementOnce();

    expect(count).toBe(1);
  });

  it("retry() with exponential backoff", async () => {
    const times: number[] = [];
    let start = Date.now();

    retry(async () => {
      times.push(Date.now() - start);
      start = Date.now();
      return null;
    }, 4);

    await jest.runAllTimersAsync();

    expect(times.length).toBe(4);
    expect(times[0]).toBe(0);
    expect(times[1]).toBe(1000);
    expect(times[2]).toBe(2000);
    expect(times[3]).toBe(4000);
  });

  it("retry() returns early with result", async () => {
    let count = 0;

    const result = retry(async () => {
      return ++count === 2 ? "done" : null;
    }, 5);

    await jest.runAllTimersAsync();

    expect(count).toBe(2);
    expect(await result).toBe("done");
  });

  it("withRetry() with exponential backoff", async () => {
    const times: number[] = [];

    let start = Date.now();
    withRetry(async () => {
      times.push(Date.now() - start);
      start = Date.now();
      throw new Error();
    }, 4).catch(() => null);

    await jest.runAllTimersAsync();

    expect(times.length).toBe(4);
    expect(times[0]).toBe(0);
    expect(times[1]).toBe(1000);
    expect(times[2]).toBe(2000);
    expect(times[3]).toBe(4000);
  });

  it("withRetry() returns early with result", async () => {
    let count = 0;

    const result = withRetry(async () => {
      if (++count === 2) {
        return "done";
      }
      throw new Error();
    }, 5);

    await jest.runAllTimersAsync();

    expect(count).toBe(2);
    expect(await result).toBe("done");
  });
});
