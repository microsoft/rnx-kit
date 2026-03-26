import { deepEqual, equal, ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  getTransformerPluginOptions,
  isPromiseLike,
  lazyInit,
  setTransformerPluginOptions,
  toArray,
} from "../src/utils";

describe("toArray", () => {
  it("returns empty array for null", () => {
    deepEqual(toArray(null), []);
  });

  it("returns empty array for undefined", () => {
    deepEqual(toArray(undefined), []);
  });

  it("wraps a single value in an array", () => {
    deepEqual(toArray("hello"), ["hello"]);
  });

  it("returns the same array if already an array", () => {
    const arr = [1, 2, 3];
    deepEqual(toArray(arr), [1, 2, 3]);
  });

  it("wraps a single number", () => {
    deepEqual(toArray(42), [42]);
  });

  it("returns empty array as-is", () => {
    deepEqual(toArray([]), []);
  });
});

describe("isPromiseLike", () => {
  it("returns true for a real promise", () => {
    ok(isPromiseLike(Promise.resolve(42)));
  });

  it("returns true for a thenable object", () => {
    // eslint-disable-next-line unicorn/no-thenable
    ok(isPromiseLike({ then: () => undefined }));
  });

  it("returns false for null", () => {
    equal(isPromiseLike(null), false);
  });

  it("returns false for undefined", () => {
    equal(isPromiseLike(undefined), false);
  });

  it("returns false for a string", () => {
    equal(isPromiseLike("hello"), false);
  });

  it("returns false for a number", () => {
    equal(isPromiseLike(42), false);
  });

  it("returns false for a plain object without then", () => {
    equal(isPromiseLike({ value: 1 }), false);
  });

  it("returns false for an object with non-function then", () => {
    // eslint-disable-next-line unicorn/no-thenable
    equal(isPromiseLike({ then: "not a function" }), false);
  });
});

describe("lazyInit", () => {
  it("returns the value from the factory", () => {
    const get = lazyInit(() => 42);
    equal(get(), 42);
  });

  it("only calls the factory once", () => {
    let callCount = 0;
    const get = lazyInit(() => {
      callCount++;
      return "value";
    });
    get();
    get();
    get();
    equal(callCount, 1);
  });

  it("caches the factory result across calls", () => {
    const obj = { x: 1 };
    const get = lazyInit(() => obj);
    ok(get() === get());
  });
});

describe("setTransformerPluginOptions / getTransformerPluginOptions", () => {
  const envVar = "RNX_TRANSFORMER_ESBUILD_OPTIONS";

  afterEach(() => {
    delete process.env[envVar];
  });

  it("round-trips options through the environment", () => {
    const options = { handleJs: true, handleJsx: false };
    setTransformerPluginOptions(options);
    deepEqual(getTransformerPluginOptions(), options);
  });

  it("returns empty object when no options are set", () => {
    deepEqual(getTransformerPluginOptions(), {});
  });

  it("serializes upstream delegates", () => {
    const options = {
      upstreamDelegates: {
        "./my-transformer": [".json", ".graphql"],
      },
    };
    setTransformerPluginOptions(options);
    deepEqual(getTransformerPluginOptions(), options);
  });

  it("converts boolean dynamicKey to a timestamp string", () => {
    setTransformerPluginOptions({ dynamicKey: true });
    const result = getTransformerPluginOptions();
    equal(typeof result.dynamicKey, "string");
    // should be a valid ISO date string
    ok(!isNaN(Date.parse(result.dynamicKey as string)));
  });

  it("preserves string dynamicKey as-is", () => {
    setTransformerPluginOptions({ dynamicKey: "my-key" });
    const result = getTransformerPluginOptions();
    equal(result.dynamicKey, "my-key");
  });
});
