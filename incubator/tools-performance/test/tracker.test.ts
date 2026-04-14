import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { PerfTracker } from "../src/tracker.ts";

function noopHandler() {
  // intentionally empty — suppresses report output for tests
}

// Helper: suppress report output for tests that don't care about it
const quiet = { reportHandler: noopHandler, strategy: "timing" as const };

describe("PerfTracker", () => {
  describe("enable / isEnabled", () => {
    it("enables all tracking with true via constructor", () => {
      const tracker = new PerfTracker(quiet);
      equal(tracker.isEnabled("metro"), true);
      tracker.finish();
    });

    it("enables a single category", () => {
      const tracker = new PerfTracker({ ...quiet, enable: "metro" });
      equal(tracker.isEnabled("metro"), true);
      equal(tracker.isEnabled("resolve"), false);
      tracker.finish();
    });

    it("enables multiple categories from an array", () => {
      const tracker = new PerfTracker({
        ...quiet,
        enable: ["metro", "resolve"],
      });
      equal(tracker.isEnabled("metro"), true);
      equal(tracker.isEnabled("resolve"), true);
      equal(tracker.isEnabled("transform"), false);
      tracker.finish();
    });

    it("is additive across multiple enable calls", () => {
      const tracker = new PerfTracker({ ...quiet, enable: "metro" });
      tracker.enable("resolve");
      equal(tracker.isEnabled("metro"), true);
      equal(tracker.isEnabled("resolve"), true);
      tracker.finish();
    });

    it("global enable makes all specific domains enabled", () => {
      const tracker = new PerfTracker({ ...quiet, enable: true });
      equal(tracker.isEnabled("metro"), true);
      equal(tracker.isEnabled("anything"), true);
      tracker.finish();
    });
  });

  describe("domain", () => {
    it("returns a domain when the category is enabled", () => {
      const tracker = new PerfTracker({ ...quiet, enable: "metro" });
      const domain = tracker.domain("metro");
      ok(domain !== undefined);
      equal(domain!.name, "metro");
      tracker.finish();
    });

    it("returns undefined when the category is not enabled", () => {
      const tracker = new PerfTracker({ ...quiet, enable: "metro" });
      const domain = tracker.domain("resolve");
      equal(domain, undefined);
      tracker.finish();
    });

    it("returns the same domain on repeated calls", () => {
      const tracker = new PerfTracker({ ...quiet, enable: "metro" });
      const d1 = tracker.domain("metro");
      const d2 = tracker.domain("metro");
      equal(d1, d2);
      tracker.finish();
    });

    it("returns a domain for any name when globally enabled", () => {
      const tracker = new PerfTracker({ ...quiet, enable: true });
      ok(tracker.domain("anything") !== undefined);
      tracker.finish();
    });
  });

  describe("recording via timing strategy", () => {
    it("tracks calls and completions through trace", () => {
      let report = "";
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportHandler: (r) => (report = r),
      });
      const domain = tracker.domain("test")!;
      const trace = domain.getTrace();

      trace("op", () => 42);

      tracker.finish();
      ok(report.includes("op"));
    });

    it("traces async functions correctly", async () => {
      let report = "";
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportHandler: (r) => (report = r),
      });
      const domain = tracker.domain("test")!;
      const trace = domain.getTrace();

      const result = await trace(
        "delayed",
        () =>
          new Promise<number>((resolve) => setTimeout(() => resolve(42), 10))
      );

      equal(result, 42);
      tracker.finish();
      ok(report.includes("delayed"));
    });

    it("counts errors when traced function throws", () => {
      let report = "";
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportColumns: ["name", "calls", "errors"],
        reportHandler: (r) => (report = r),
      });
      const domain = tracker.domain("test")!;
      const trace = domain.getTrace();

      try {
        trace("fail", () => {
          throw new Error("boom");
        });
      } catch {
        // expected
      }

      tracker.finish();
      ok(report.includes("fail"));
    });
  });

  describe("finish", () => {
    it("reports when there is data", () => {
      let report = "";
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportHandler: (r) => (report = r),
      });
      const domain = tracker.domain("test")!;
      domain.getTrace()("op", () => 42);

      tracker.finish();
      ok(report.length > 0);
    });

    it("does not report when there is no data", () => {
      let reportCalled = false;
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportHandler: () => (reportCalled = true),
      });

      tracker.finish();
      equal(reportCalled, false);
    });

    it("only reports once even if called multiple times", () => {
      let callCount = 0;
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportHandler: () => callCount++,
      });
      const domain = tracker.domain("test")!;
      domain.getTrace()("op", () => 1);

      tracker.finish();
      tracker.finish();
      tracker.finish();

      equal(callCount, 1);
    });
  });

  describe("updateConfig", () => {
    it("merges new config values", () => {
      let report = "";
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportColumns: ["name", "total"],
        reportHandler: (r) => (report = r),
      });
      const domain = tracker.domain("test")!;
      domain.getTrace()("op", () => 1);

      tracker.updateConfig({ reportColumns: ["name", "calls"] });
      tracker.finish();

      ok(report.includes("operation"));
      ok(report.includes("calls"));
      ok(!report.includes("total"));
    });

    it("adds new enabled domains via updateConfig", () => {
      const tracker = new PerfTracker({ ...quiet, enable: "metro" });
      equal(tracker.isEnabled("resolve"), false);

      tracker.updateConfig({ enable: "resolve" });
      equal(tracker.isEnabled("resolve"), true);
      equal(tracker.isEnabled("metro"), true);
      tracker.finish();
    });
  });

  describe("report columns", () => {
    it("uses default columns when none specified", () => {
      let report = "";
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportHandler: (r) => (report = r),
      });
      const domain = tracker.domain("test")!;
      domain.getTrace()("op", () => 1);
      tracker.finish();

      ok(report.includes("operation"));
      ok(report.includes("calls"));
      ok(report.includes("total"));
      ok(report.includes("avg"));
    });

    it("respects custom reportColumns", () => {
      let report = "";
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        reportColumns: ["name", "total"],
        reportHandler: (r) => (report = r),
      });
      const domain = tracker.domain("test")!;
      domain.getTrace()("op", () => 1);
      tracker.finish();

      ok(report.includes("operation"));
      ok(report.includes("total"));
      ok(!report.includes("calls"));
      ok(!report.includes("avg"));
    });

    it("respects maxNameWidth", () => {
      let report = "";
      const tracker = new PerfTracker({
        ...quiet,
        enable: true,
        maxNameWidth: 10,
        reportColumns: ["name"],
        reportHandler: (r) => (report = r),
      });
      const domain = tracker.domain("test")!;
      domain.getTrace()("a-very-long-operation-name-here", () => 1);
      tracker.finish();

      ok(report.includes("..."), "should truncate long names");
    });
  });
});
