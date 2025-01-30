import { getNullTimer, getTimer } from "../src/reporter";

let asyncCalls = 0;
let syncCalls = 0;

function asyncTestOperation(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      asyncCalls++;
      resolve();
    }, 10);
  });
}

function syncTestOperation(): void {
  syncCalls++;
}

describe("createTimer and getNullTimer", () => {
  beforeEach(() => {
    asyncCalls = 0;
    syncCalls = 0;
  });

  it("timer times sync calls", () => {
    const timer = getTimer();
    const calls = 10;
    for (let i = 0; i < calls; i++) {
      timer.time("sync", syncTestOperation);
    }
    const results = timer.results();
    expect(results.sync.count).toBe(calls);
    expect(syncCalls).toBe(calls);
  });

  it("timer times async calls", async () => {
    const timer = getTimer();
    const calls = 10;
    for (let i = 0; i < calls; i++) {
      await timer.timeAsync("async", asyncTestOperation);
    }
    const results = timer.results();
    expect(results.async.count).toBe(calls);
    expect(results.async.time).toBeGreaterThan(0);
    expect(asyncCalls).toBe(calls);
  });

  it("null timers should still execute", async () => {
    const timer = getNullTimer();
    const calls = 10;
    for (let i = 0; i < calls; i++) {
      timer.time("sync", syncTestOperation);
      await timer.timeAsync("async", asyncTestOperation);
    }
    expect(syncCalls).toBe(calls);
    expect(asyncCalls).toBe(calls);
    expect(timer.results()).toEqual({});
  });
});
