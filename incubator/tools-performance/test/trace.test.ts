import { deepEqual, equal, rejects } from "node:assert/strict";
import { describe, it } from "node:test";
import { createTrace, nullRecord, nullTrace } from "../src/trace.ts";

describe("nullRecord", () => {
  it("accepts a tag with no duration", () => {
    nullRecord("tag");
  });

  it("accepts a tag with a duration", () => {
    nullRecord("tag", 42);
  });
});

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
  it("records a before call and an after call with duration", () => {
    const calls: { tag: string; duration?: number }[] = [];
    const trace = createTrace<string>((tag, duration) => {
      calls.push({ tag, duration });
    });

    trace("op", () => 42);

    equal(calls.length, 2);
    equal(calls[0]!.tag, "op");
    equal(calls[0]!.duration, undefined);
    equal(calls[1]!.tag, "op");
    equal(typeof calls[1]!.duration, "number");
  });

  it("returns the sync function result", () => {
    const trace = createTrace(nullRecord);
    const result = trace("op", (a: number, b: number) => a * b, 6, 7);
    equal(result, 42);
  });

  it("passes arguments to the traced function", () => {
    const trace = createTrace(nullRecord);
    const result = trace(
      "concat",
      (a: string, b: string) => `${a}-${b}`,
      "foo",
      "bar"
    );
    equal(result, "foo-bar");
  });

  it("handles async functions and records duration after resolution", async () => {
    const calls: { tag: string; duration?: number }[] = [];
    const trace = createTrace<string>((tag, duration) => {
      calls.push({ tag, duration });
    });

    const result = await trace(
      "async-op",
      () =>
        new Promise<string>((resolve) => setTimeout(() => resolve("done"), 10))
    );

    equal(result, "done");
    equal(calls.length, 2);
    equal(calls[0]!.duration, undefined);
    equal(typeof calls[1]!.duration, "number");
  });

  it("does not record end duration when sync function throws", () => {
    const calls: { tag: string; duration?: number }[] = [];
    const trace = createTrace<string>((tag, duration) => {
      calls.push({ tag, duration });
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
    equal(calls[0]!.duration, undefined);
  });

  it("does not record end duration when async function rejects", async () => {
    const calls: { tag: string; duration?: number }[] = [];
    const trace = createTrace<string>((tag, duration) => {
      calls.push({ tag, duration });
    });

    await rejects(
      trace("fail-async", () => Promise.reject(new Error("async boom")))
    );

    equal(calls.length, 1, "only the before-call should be recorded");
  });

  it("supports custom tag types", () => {
    const tags: number[] = [];
    const trace = createTrace<number>((tag) => {
      tags.push(tag);
    });

    trace(123, () => "ok");
    deepEqual(tags, [123, 123]);
  });
});
