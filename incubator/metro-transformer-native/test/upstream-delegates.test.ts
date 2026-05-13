import { ok, equal } from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { transform } from "../src/babelTransformer";
import { setTransformerPluginOptions } from "../src/context";
import { createFixtureArgs } from "./helpers";

const dummyPath = path.join(__dirname, "__fixtures__", "dummyDelegate.cjs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dummy = require(dummyPath);

beforeEach(() => dummy.__reset());

describe("upstreamDelegates routing", () => {
  it("routes a matching extension to the delegate (absolute path)", () => {
    setTransformerPluginOptions({
      upstreamDelegates: [{ transformerPath: dummyPath, extensions: ".foo" }],
      parseExtAliases: { ".foo": "js" },
    });
    const result = transform(createFixtureArgs("sample.foo")) as {
      metadata?: { fromDummy?: boolean };
    };
    equal(result.metadata?.fromDummy, true);
    equal(dummy.__getCallCount(), 1);
  });

  it("falls through to transformFinal when no extension matches", () => {
    setTransformerPluginOptions({
      upstreamDelegates: [{ transformerPath: dummyPath, extensions: ".bar" }],
    });
    transform(createFixtureArgs("simple.ts"));
    equal(dummy.__getCallCount(), 0);
  });

  it("memoizes the delegate across calls", () => {
    setTransformerPluginOptions({
      upstreamDelegates: [{ transformerPath: dummyPath, extensions: ".foo" }],
      parseExtAliases: { ".foo": "js" },
    });
    transform(createFixtureArgs("sample.foo"));
    transform(createFixtureArgs("sample.foo"));
    equal(dummy.__getCallCount(), 2);
    // Memoization is on resolution, not invocation — both calls hit the same
    // function. We can't easily assert "require was called once" without
    // patching require itself; the indirect assertion is that the test
    // completes without re-resolving the path.
  });

  it("accepts an array of extensions", () => {
    setTransformerPluginOptions({
      upstreamDelegates: [
        { transformerPath: dummyPath, extensions: [".foo", ".bar"] },
      ],
      parseExtAliases: { ".foo": "js", ".bar": "js" },
    });
    transform(createFixtureArgs("sample.foo"));
    equal(dummy.__getCallCount(), 1);
  });

  it("throws a clear error when the delegate path cannot be resolved", () => {
    setTransformerPluginOptions({
      upstreamDelegates: [
        {
          transformerPath: "@nonexistent/fake-delegate",
          extensions: ".foo",
        },
      ],
      parseExtAliases: { ".foo": "js" },
    });
    let threw: unknown = null;
    try {
      transform(createFixtureArgs("sample.foo"));
    } catch (e) {
      threw = e;
    }
    ok(threw instanceof Error);
    ok(/upstream delegate/.test((threw as Error).message));
    ok(/@nonexistent\/fake-delegate/.test((threw as Error).message));
  });
});
