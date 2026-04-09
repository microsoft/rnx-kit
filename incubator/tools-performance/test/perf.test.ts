import { equal, ok } from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  getRecorder,
  getTrace,
  isTrackingEnabled,
  reportPerfData,
  trackPerformance,
} from "../src/perf.ts";
import { nullTrace } from "../src/trace.ts";

function emptyFunction() {
  // intentionally empty
}

describe("module-level perf API", () => {
  it("trackPerformance enables tracking", () => {
    trackPerformance(true);
    equal(isTrackingEnabled(), true);
  });

  it("trackPerformance enables a specific category", () => {
    trackPerformance("metro");
    equal(isTrackingEnabled("metro"), true);
  });

  it("getTrace returns a working trace function after enabling", () => {
    trackPerformance(true);
    const trace = getTrace();
    ok(trace !== nullTrace);
    const result = trace("add", (a: number, b: number) => a + b, 1, 2);
    equal(result, 3);
  });

  it("getRecorder returns a working recorder after enabling", () => {
    trackPerformance("metro");
    const record = getRecorder("metro");
    // Should not throw
    record("op1");
    record("op1", 42);
  });

  it("reportPerfData prints results", () => {
    const logMock = mock.method(console, "log", emptyFunction);
    try {
      trackPerformance(true);
      getTrace()("op", () => 42);
      reportPerfData();
      ok(logMock.mock.callCount() >= 2);
    } finally {
      logMock.mock.restore();
    }
  });
});
