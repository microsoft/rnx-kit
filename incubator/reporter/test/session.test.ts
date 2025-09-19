/**
 * Unit tests for session.ts functionality using Node's built-in test framework.
 *
 * These tests verify:
 * - Session creation and configuration
 * - Session lifecycle management (start, finish, measure, task)
 * - Error handling and event publishing
 * - Session hierarchy and depth tracking
 * - Timer functionality and operation aggregation
 *
 * All tests use mock output streams and do not write to real files or console.
 */

import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { errorEvent, finishEvent, startEvent } from "../src/events.ts";
import { createReporter } from "../src/reporter.ts";
import { createSession } from "../src/session.ts";
import type {
  ErrorResult,
  NormalResult,
  Reporter,
  ReporterOptions,
  SessionData,
} from "../src/types.ts";
import { type MockOutput, mockOutput, restoreOutput } from "./streams.test.ts";

describe("session", () => {
  let mockOut: MockOutput;
  let mockReportLogs: string[];
  let mockCreateReporter: (
    options: ReporterOptions,
    parent?: SessionData
  ) => Reporter;

  beforeEach(() => {
    mockOut = mockOutput();
    mockReportLogs = [];

    // Mock createReporter function
    mockCreateReporter = (options: ReporterOptions, _parent?: SessionData) => {
      return createReporter(options);
    };
  });

  afterEach(() => {
    restoreOutput();
    mockOut.clear();
    mockReportLogs = [];
  });

  describe("createSession", () => {
    it("should create a session with basic options", () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      assert.ok(session);
      assert.strictEqual(session.session.name, "test-session");
      assert.strictEqual(session.session.role, "reporter");
      assert.strictEqual(session.session.depth, 0);
      assert.strictEqual(session.session.elapsed, 0);
      assert.deepStrictEqual(session.session.errors, []);
      assert.deepStrictEqual(session.session.operations, {});
      assert.strictEqual(session.session.parent, undefined);
    });

    it("should set role from options", () => {
      const options: ReporterOptions = { name: "test-task", role: "task" };
      const session = createSession(options, undefined, mockCreateReporter);

      assert.strictEqual(session.session.role, "task");
    });

    it("should set packageName and data from options", () => {
      const options: ReporterOptions = {
        name: "test-session",
        packageName: "@test/package",
        data: { version: "1.0.0", environment: "test" },
      };
      const session = createSession(options, undefined, mockCreateReporter);

      assert.strictEqual(session.session.packageName, "@test/package");
      assert.deepStrictEqual(session.session.data, {
        version: "1.0.0",
        environment: "test",
      });
    });

    it("should set depth based on parent", () => {
      const parentSession: SessionData = {
        name: "parent",
        role: "reporter",
        data: {},
        depth: 2,
        elapsed: 0,
        errors: [],
        operations: {},
      };

      const options: ReporterOptions = { name: "child-session" };
      const session = createSession(options, parentSession, mockCreateReporter);

      assert.strictEqual(session.session.depth, 3);
      assert.strictEqual(session.session.parent, parentSession);
    });

    it("should call report function with start timer message", () => {
      const options: ReporterOptions = { name: "timed-session" };
      const reportFn = (...args: unknown[]) =>
        mockReportLogs.push(args.join(" "));

      createSession(options, undefined, mockCreateReporter, reportFn);

      assert.strictEqual(mockReportLogs.length, 1);
      assert.ok(mockReportLogs[0].includes("⌚ Starting: timed-session"));
    });
  });

  describe("session.start", () => {
    it("should create a sub-reporter with string name", () => {
      const options: ReporterOptions = { name: "parent-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const subReporter = session.start({ name: "sub-reporter" });

      assert.ok(subReporter);
      assert.ok(typeof subReporter.log === "function");
      assert.ok(typeof subReporter.error === "function");
    });

    it("should create a sub-reporter with ReporterInfo", () => {
      const options: ReporterOptions = { name: "parent-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const subReporter = session.start({
        name: "sub-reporter",
        packageName: "@test/sub",
      });

      assert.ok(subReporter);
    });
  });

  describe("session.finish", () => {
    it("should finish with success result", () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const result = session.finish({ value: "success" });

      assert.strictEqual(result, "success");
      assert.ok(session.session.result);
      assert.strictEqual(
        (session.session.result as NormalResult<string>).value,
        "success"
      );
      assert.ok(session.session.elapsed > 0);
    });

    it("should finish with error result", () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const error = new Error("Test error");

      assert.throws(() => {
        session.finish({ error });
      }, /Test error/);

      assert.ok(session.session.result);
      assert.strictEqual((session.session.result as ErrorResult).error, error);
      assert.strictEqual(session.session.errors.length, 1);
      assert.strictEqual(session.session.errors[0][0], error);
    });

    it("should only finish once", () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const result1 = session.finish({ value: "first" });
      const result2 = session.finish({ value: "second" });

      assert.strictEqual(result1, "first");
      assert.strictEqual(result2, "first"); // Should return first result
      assert.strictEqual(
        (session.session.result as NormalResult<string>).value,
        "first"
      );
    });

    it("should call report function with finish timer message", () => {
      const options: ReporterOptions = { name: "timed-session" };
      const reportFn = (...args: unknown[]) =>
        mockReportLogs.push(args.join(" "));
      const session = createSession(
        options,
        undefined,
        mockCreateReporter,
        reportFn
      );

      session.finish({ value: "done" });

      assert.strictEqual(mockReportLogs.length, 2);
      assert.ok(mockReportLogs[0].includes("⌚ Starting: timed-session"));
      assert.ok(mockReportLogs[1].includes("⌚ Finished: timed-session"));
      assert.ok(mockReportLogs[1].includes("ms"));
    });
  });

  describe("session.measure", () => {
    it("should measure synchronous operation", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const result = await session.measure("sync-op", () => "sync-result");

      assert.strictEqual(result, "sync-result");
      assert.ok(session.session.operations["sync-op"]);
      assert.strictEqual(session.session.operations["sync-op"].calls, 1);
      assert.strictEqual(session.session.operations["sync-op"].errors, 0);
      assert.ok(session.session.operations["sync-op"].elapsed > 0);
    });

    it("should measure asynchronous operation", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const result = await session.measure("async-op", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-result";
      });

      assert.strictEqual(result, "async-result");
      assert.ok(session.session.operations["async-op"]);
      assert.strictEqual(session.session.operations["async-op"].calls, 1);
      assert.strictEqual(session.session.operations["async-op"].errors, 0);
      assert.ok(session.session.operations["async-op"].elapsed > 0);
    });

    it("should track operation errors", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      await assert.rejects(async () => {
        await session.measure("error-op", () => {
          throw new Error("Operation failed");
        });
      }, /Operation failed/);

      assert.ok(session.session.operations["error-op"]);
      assert.strictEqual(session.session.operations["error-op"].calls, 1);
      assert.strictEqual(session.session.operations["error-op"].errors, 1);
    });

    it("should aggregate multiple calls to same operation", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      await session.measure("repeated-op", () => "first");
      await session.measure("repeated-op", () => "second");

      assert.ok(session.session.operations["repeated-op"]);
      assert.strictEqual(session.session.operations["repeated-op"].calls, 2);
      assert.strictEqual(session.session.operations["repeated-op"].errors, 0);
    });

    it("should call report function with timer messages", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const reportFn = (...args: unknown[]) =>
        mockReportLogs.push(args.join(" "));
      const session = createSession(
        options,
        undefined,
        mockCreateReporter,
        reportFn
      );

      await session.measure("timed-op", () => "result");

      assert.ok(
        mockReportLogs.some((log) => log.includes("⌚ Starting: timed-op"))
      );
      assert.ok(
        mockReportLogs.some((log) => log.includes("⌚ Finished: timed-op"))
      );
    });
  });

  describe("session.task", () => {
    it("should execute task with string name", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const result = await session.task("test-task", (reporter) => {
        assert.ok(reporter);
        assert.ok(typeof reporter.log === "function");
        return "task-result";
      });

      assert.strictEqual(result, "task-result");
    });

    it("should execute task with ReporterInfo", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const result = await session.task(
        { name: "named-task", packageName: "@test/task" },
        () => {
          return "named-task-result";
        }
      );

      assert.strictEqual(result, "named-task-result");
    });

    it("should handle async task functions", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const result = await session.task("async-task", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-task-result";
      });

      assert.strictEqual(result, "async-task-result");
    });

    it("should handle task errors", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      await assert.rejects(async () => {
        await session.task("error-task", () => {
          throw new Error("Task failed");
        });
      }, /Task failed/);
    });
  });

  describe("session.onError", () => {
    it("should track errors in session", () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const testArgs = ["Error message", { detail: "error detail" }];
      session.onError(testArgs);

      assert.strictEqual(session.session.errors.length, 1);
      assert.deepStrictEqual(session.session.errors[0], testArgs);
    });

    it("should track multiple errors", () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      session.onError(["First error"]);
      session.onError(["Second error"]);

      assert.strictEqual(session.session.errors.length, 2);
      assert.deepStrictEqual(session.session.errors[0], ["First error"]);
      assert.deepStrictEqual(session.session.errors[1], ["Second error"]);
    });
  });

  describe("event publishing", () => {
    it("should publish start event when session is created", () => {
      let publishedSession: SessionData | undefined;
      const unsubscribe = startEvent().subscribe((session) => {
        publishedSession = session;
      });

      try {
        const options: ReporterOptions = { name: "event-session" };
        const session = createSession(options, undefined, mockCreateReporter);

        assert.ok(publishedSession);
        assert.strictEqual(publishedSession.name, "event-session");
        assert.strictEqual(publishedSession, session.session);
      } finally {
        unsubscribe();
      }
    });

    it("should publish finish event when session finishes", () => {
      let publishedSession: SessionData | undefined;
      const unsubscribe = finishEvent().subscribe((session) => {
        publishedSession = session;
      });

      try {
        const options: ReporterOptions = { name: "finish-event-session" };
        const session = createSession(options, undefined, mockCreateReporter);

        session.finish({ value: "completed" });

        assert.ok(publishedSession);
        assert.strictEqual(publishedSession.name, "finish-event-session");
        assert.ok(publishedSession.result);
      } finally {
        unsubscribe();
      }
    });

    it("should publish error event when onError is called", () => {
      let publishedEvent: { session: SessionData; args: unknown[] } | undefined;
      const unsubscribe = errorEvent().subscribe((event) => {
        publishedEvent = event;
      });

      try {
        const options: ReporterOptions = { name: "error-event-session" };
        const session = createSession(options, undefined, mockCreateReporter);

        const errorArgs = ["Test error"];
        session.onError(errorArgs);

        assert.ok(publishedEvent);
        assert.strictEqual(publishedEvent.session.name, "error-event-session");
        assert.deepStrictEqual(publishedEvent.args, errorArgs);
      } finally {
        unsubscribe();
      }
    });

    it("should publish error event when finish is called with error", () => {
      let publishedEvent: { session: SessionData; args: unknown[] } | undefined;
      const unsubscribe = errorEvent().subscribe((event) => {
        publishedEvent = event;
      });

      try {
        const options: ReporterOptions = { name: "error-finish-session" };
        const session = createSession(options, undefined, mockCreateReporter);

        const error = new Error("Finish error");

        assert.throws(() => {
          session.finish({ error });
        });

        assert.ok(publishedEvent);
        assert.strictEqual(publishedEvent.session.name, "error-finish-session");
        assert.strictEqual(publishedEvent.args[0], error);
      } finally {
        unsubscribe();
      }
    });
  });

  describe("edge cases", () => {
    it("should handle finish without explicit result", () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      // Use the internal behavior - when finish is called without explicit result, it's undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (session as any).finish();

      assert.strictEqual(result, undefined);
      assert.strictEqual(session.session.result, undefined);
    });

    it("should handle empty data object", () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      assert.deepStrictEqual(session.session.data, {});
    });

    it("should handle operation name with special characters", async () => {
      const options: ReporterOptions = { name: "test-session" };
      const session = createSession(options, undefined, mockCreateReporter);

      const opName = "op-with-special.chars_123";
      await session.measure(opName, () => "result");

      assert.ok(session.session.operations[opName]);
      assert.strictEqual(session.session.operations[opName].calls, 1);
    });
  });
});
