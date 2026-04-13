import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDomain,
  getTrace,
  isTrackingEnabled,
  reportPerfData,
  trackPerformance,
} from "../src/perf.ts";
import { nullTrace } from "../src/trace.ts";

// The module-level API uses a singleton, so we need to be aware that
// state carries across tests within the same module. Tests here are
// ordered to account for the additive nature of trackPerformance.

describe("module-level perf API", () => {
  it("getTrace returns nullTrace before enabling", () => {
    // Before any trackPerformance call, there is no manager
    // Note: if a prior test already called trackPerformance, this test
    // will see the singleton. We test the cold-start path here.
    const trace = getTrace("unregistered-domain");
    equal(trace, nullTrace);
  });

  it("trackPerformance enables tracking", () => {
    trackPerformance({ enable: true, strategy: "timing" });
    equal(isTrackingEnabled("metro"), true);
  });

  it("getTrace returns a working trace function after enabling", () => {
    trackPerformance({ enable: true, strategy: "timing" });
    const trace = getTrace("metro");
    ok(trace !== nullTrace);
    const result = trace("add", (a: number, b: number) => a + b, 1, 2);
    equal(result, 3);
  });

  it("trackPerformance enables a specific category", () => {
    trackPerformance({ enable: "resolve", strategy: "timing" });
    equal(isTrackingEnabled("resolve"), true);
  });

  it("getDomain returns a domain when enabled", () => {
    trackPerformance({ enable: "transform", strategy: "timing" });
    const domain = getDomain("transform");
    ok(domain !== undefined);
    equal(domain!.name, "transform");
  });

  it("getDomain returns a domain for any name when globally enabled", () => {
    // trackPerformance with enable:true was called above, so all domains are accessible
    const domain = getDomain("any-domain-name");
    ok(domain !== undefined);
  });

  it("isTraceEnabled checks frequency", () => {
    trackPerformance({ enable: "freq-test", strategy: "timing" });
    const domain = getDomain("freq-test");
    ok(domain !== undefined);
    // default frequency is "medium"
    equal(isTrackingEnabled("freq-test", "low"), true);
    equal(isTrackingEnabled("freq-test", "medium"), true);
    equal(isTrackingEnabled("freq-test", "high"), false);
  });

  it("reportPerfData does not throw", () => {
    // Just verify it doesn't throw — the singleton may or may not have data
    reportPerfData();
  });
});
