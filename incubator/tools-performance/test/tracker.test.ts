import { equal, ok } from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { nullTrace } from "../src/trace.ts";
import { PerfManager } from "../src/tracker.ts";

function emptyFunction() {
  // intentionally empty
}

describe("PerfManager", () => {
  describe("enable / isEnabled", () => {
    it("is not enabled by default", () => {
      const mgr = new PerfManager();
      equal(mgr.isEnabled(), false);
      equal(mgr.isEnabled("metro"), false);
    });

    it("enables all tracking with true", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      equal(mgr.isEnabled(), true);
    });

    it("enables a single category", () => {
      const mgr = new PerfManager();
      mgr.enable("metro");
      equal(mgr.isEnabled("metro"), true);
      equal(mgr.isEnabled("resolve"), false);
      equal(mgr.isEnabled(), false);
    });

    it("enables multiple categories from an array", () => {
      const mgr = new PerfManager();
      mgr.enable(["metro", "resolve"]);
      equal(mgr.isEnabled("metro"), true);
      equal(mgr.isEnabled("resolve"), true);
      equal(mgr.isEnabled("transform"), false);
    });

    it("is additive across multiple enable calls", () => {
      const mgr = new PerfManager();
      mgr.enable("metro");
      mgr.enable("resolve");
      equal(mgr.isEnabled("metro"), true);
      equal(mgr.isEnabled("resolve"), true);
    });
  });

  describe("record", () => {
    it("creates an entry on first call", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const record = mgr.getRecorder();
      record("op1"); // before
      record("op1", 10); // after

      const results = mgr.getResults();
      equal(results.length, 1);
      equal(results[0]!.calls, 1);
      equal(results[0]!.total, 10);
      equal(results[0]!.errors, 0);
    });

    it("accumulates multiple calls to the same operation", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const record = mgr.getRecorder();
      record("op1"); // before
      record("op1", 10); // after
      record("op1"); // before
      record("op1", 20); // after

      const results = mgr.getResults();
      equal(results[0]!.calls, 2);
      equal(results[0]!.total, 30);
      equal(results[0]!.avg, 15);
      equal(results[0]!.errors, 0);
    });

    it("tracks multiple operations independently", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const record = mgr.getRecorder();
      record("op1");
      record("op1", 10);
      record("op2");
      record("op2", 20);

      const results = mgr.getResults();
      equal(results.length, 2);
    });
  });

  describe("getResults", () => {
    it("computes errors from mismatched start/end counts", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const record = mgr.getRecorder();
      // 3 starts, only 1 end → 2 errors
      record("op1");
      record("op1");
      record("op1");
      record("op1", 5);

      const results = mgr.getResults();
      equal(results[0]!.calls, 3);
      equal(results[0]!.errors, 2);
    });

    it("computes average from completed calls only", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const record = mgr.getRecorder();
      // 3 starts, 2 completions with durations 10 and 20
      record("op1");
      record("op1", 10);
      record("op1");
      record("op1", 20);
      record("op1"); // error - no completion

      const results = mgr.getResults();
      equal(results[0]!.calls, 3);
      equal(results[0]!.avg, 15); // (10 + 20) / 2
      equal(results[0]!.errors, 1);
    });

    it("returns avg of zero when no calls have completed", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const record = mgr.getRecorder();
      record("op1");
      record("op1");

      const results = mgr.getResults();
      equal(results[0]!.avg, 0);
    });

    it("returns raw strings without ANSI codes", () => {
      const mgr = new PerfManager();
      mgr.enable("metro");
      const record = mgr.getRecorder("metro");
      record("bundle");
      record("bundle", 100);

      const results = mgr.getResults();
      equal(results[0]!.area, "metro");
      equal(results[0]!.operation, "bundle");
      equal(results[0]!.name, "metro: bundle");
    });

    it("omits area prefix when no category is provided", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const record = mgr.getRecorder();
      record("bundle");
      record("bundle", 100);

      const results = mgr.getResults();
      equal(results[0]!.area, "");
      equal(results[0]!.name, "bundle");
    });
  });

  describe("getTrace / getRecorder", () => {
    it("returns nullTrace when category is not enabled", () => {
      const mgr = new PerfManager();
      equal(mgr.getTrace("metro"), nullTrace);
    });

    it("returns a real trace function when category is enabled", () => {
      const mgr = new PerfManager();
      mgr.enable("metro");
      ok(mgr.getTrace("metro") !== nullTrace);
    });

    it("traces a sync function and records its duration", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const trace = mgr.getTrace();
      const result = trace("add", (a: number, b: number) => a + b, 2, 3);

      equal(result, 5);
      const results = mgr.getResults();
      equal(results[0]!.calls, 1);
      equal(results[0]!.errors, 0);
      ok(results[0]!.total >= 0);
    });

    it("traces an async function and records its duration", async () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const trace = mgr.getTrace();
      const result = await trace(
        "delayed",
        () =>
          new Promise<number>((resolve) => setTimeout(() => resolve(42), 10))
      );

      equal(result, 42);
      const results = mgr.getResults();
      equal(results[0]!.calls, 1);
      equal(results[0]!.errors, 0);
      ok(results[0]!.total >= 10);
    });

    it("counts errors when traced function throws", () => {
      const mgr = new PerfManager();
      mgr.enable(true);
      const trace = mgr.getTrace();
      try {
        trace("fail", () => {
          throw new Error("boom");
        });
      } catch {
        // expected
      }

      const results = mgr.getResults();
      equal(results[0]!.calls, 1);
      equal(results[0]!.errors, 1);
    });

    it("returned recorder works correctly", () => {
      const mgr = new PerfManager();
      mgr.enable("metro");
      const record = mgr.getRecorder("metro");
      // Should not throw
      record("op1");
      record("op1", 42);
    });
  });

  describe("report", () => {
    it("prints results when there is data", () => {
      const logMock = mock.method(console, "log", emptyFunction);
      try {
        const mgr = new PerfManager();
        mgr.enable(true);
        mgr.getTrace()("op", () => 42);
        mgr.report();

        equal(logMock.mock.callCount(), 2);
        equal(logMock.mock.calls[0]!.arguments[0], "Performance results:");
        ok(
          typeof logMock.mock.calls[1]!.arguments[0] === "string",
          "second log should be the table"
        );
      } finally {
        logMock.mock.restore();
      }
    });

    it("does not print when there is no data", () => {
      const logMock = mock.method(console, "log", emptyFunction);
      try {
        const mgr = new PerfManager();
        mgr.report();
        equal(logMock.mock.callCount(), 0);
      } finally {
        logMock.mock.restore();
      }
    });

    it("only prints once even if called multiple times", () => {
      const logMock = mock.method(console, "log", emptyFunction);
      try {
        const mgr = new PerfManager();
        mgr.enable(true);
        mgr.getTrace()("op", () => 1);

        mgr.report();
        mgr.report();
        mgr.report();

        equal(logMock.mock.callCount(), 2);
      } finally {
        logMock.mock.restore();
      }
    });
  });

  describe("updateConfig", () => {
    it("merges new config values", () => {
      const logMock = mock.method(console, "log", emptyFunction);
      try {
        const mgr = new PerfManager({ cols: ["name", "total"] });
        mgr.enable(true);
        mgr.getTrace()("op", () => 1);

        mgr.updateConfig({ cols: ["name", "calls"] });
        mgr.report();

        const table = logMock.mock.calls[1]!.arguments[0] as string;
        ok(table.includes("name"));
        ok(table.includes("calls"));
        ok(!table.includes("total"));
      } finally {
        logMock.mock.restore();
      }
    });
  });
});
