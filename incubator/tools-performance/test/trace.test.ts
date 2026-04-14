import { equal, rejects } from "node:assert/strict";
import { describe, it } from "node:test";
import { createTrace, nullTrace } from "../src/trace.ts";

describe("nullTrace", () => {
  it("calls the function and returns its result", () => {
    const result = nullTrace("tag", (a: number, b: number) => a + b, 2, 3);
    equal(result, 5);
  });

  it("passes through async results", async () => {
    const result = await nullTrace(
      "tag",
      (x: string) => Promise.resolve(x.toUpperCase()),
      "hello"
    );
    equal(result, "HELLO");
  });
});

describe("createTrace", () => {
  it("records a before call and an after call", () => {
    const calls: { op: string; handoff?: number }[] = [];
    const record = (op: string, handoff?: number) => {
      calls.push({ op, handoff });
      return calls.length;
    };
    const trace = createTrace(record);

    trace("op", () => 42);

    equal(calls.length, 2);
    equal(calls[0]!.op, "op");
    equal(calls[0]!.handoff, undefined);
    equal(calls[1]!.op, "op");
    equal(calls[1]!.handoff, 1); // handoff from the first call
  });

  it("returns the sync function result", () => {
    const trace = createTrace(() => undefined);
    const result = trace("op", (a: number, b: number) => a * b, 6, 7);
    equal(result, 42);
  });

  it("passes arguments to the traced function", () => {
    const trace = createTrace(() => undefined);
    const result = trace(
      "concat",
      (a: string, b: string) => `${a}-${b}`,
      "foo",
      "bar"
    );
    equal(result, "foo-bar");
  });

  it("handles async functions and records after resolution", async () => {
    const calls: { op: string; handoff?: string }[] = [];
    const record = (op: string, handoff?: string) => {
      calls.push({ op, handoff });
      return `mark-${calls.length}`;
    };
    const trace = createTrace(record);

    const result = await trace(
      "async-op",
      () =>
        new Promise<string>((resolve) => setTimeout(() => resolve("done"), 10))
    );

    equal(result, "done");
    equal(calls.length, 2);
    equal(calls[0]!.handoff, undefined);
    equal(calls[1]!.handoff, "mark-1");
  });

  it("does not record end when sync function throws", () => {
    const calls: string[] = [];
    const trace = createTrace((op: string) => {
      calls.push(op);
      return undefined;
    });

    let threw = false;
    try {
      trace("fail", () => {
        throw new Error("boom");
      });
    } catch {
      threw = true;
    }

    equal(threw, true);
    equal(calls.length, 1, "only the before-call should be recorded");
  });

  it("does not record end when async function rejects", async () => {
    const calls: string[] = [];
    const trace = createTrace((op: string) => {
      calls.push(op);
      return undefined;
    });

    await rejects(
      trace("fail-async", () => Promise.reject(new Error("async boom")))
    );

    equal(calls.length, 1, "only the before-call should be recorded");
  });
});
