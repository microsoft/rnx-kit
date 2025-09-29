import assert from "node:assert";
import { describe, it } from "node:test";
import type { FinishResult } from "../src/types.ts";
import {
  isErrorResult,
  lazyInit,
  resolveFunction,
  serialize,
} from "../src/utils.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestAny = any;

describe("utils", () => {
  describe("lazyInit", () => {
    it("should initialize value only once", () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return "initialized";
      };

      const getLazyValue = lazyInit(factory);

      // First call should initialize
      const firstResult = getLazyValue();
      assert.strictEqual(firstResult, "initialized");
      assert.strictEqual(callCount, 1);

      // Second call should return cached value
      const secondResult = getLazyValue();
      assert.strictEqual(secondResult, "initialized");
      assert.strictEqual(callCount, 1);

      // Third call should still return cached value
      const thirdResult = getLazyValue();
      assert.strictEqual(thirdResult, "initialized");
      assert.strictEqual(callCount, 1);
    });

    it("should handle different return types", () => {
      const getNumber = lazyInit(() => 42);
      const getObject = lazyInit(() => ({ key: "value" }));
      const getArray = lazyInit(() => [1, 2, 3]);

      assert.strictEqual(getNumber(), 42);
      assert.deepStrictEqual(getObject(), { key: "value" });
      assert.deepStrictEqual(getArray(), [1, 2, 3]);
    });

    it("should handle factory that throws", () => {
      const getError = lazyInit(() => {
        throw new Error("Factory error");
      });

      assert.throws(() => getError(), /Factory error/);
      // Should throw again on second call (not cached if first call threw)
      assert.throws(() => getError(), /Factory error/);
    });
  });

  describe("isErrorResult", () => {
    it("should return true for error results", () => {
      assert.strictEqual(isErrorResult({ error: new Error("test") }), true);
      assert.strictEqual(isErrorResult({ error: "string error" }), true);
      assert.strictEqual(isErrorResult({ error: undefined }), true);
    });

    it("should return false for success results", () => {
      assert.strictEqual(isErrorResult({ value: "success" }), false);
      assert.strictEqual(isErrorResult({ value: 42 }), false);
      assert.strictEqual(isErrorResult({ value: null }), false);
      assert.strictEqual(isErrorResult({ value: undefined }), false);
    });

    it("should return false for undefined/null inputs", () => {
      assert.strictEqual(isErrorResult(undefined), false);
      // @ts-expect-error Testing edge case with invalid input
      assert.strictEqual(isErrorResult(null), false);
    });

    it("should return false for empty objects", () => {
      // @ts-expect-error Testing edge case with invalid input
      assert.strictEqual(isErrorResult({}), false);
    });

    it("should handle mixed objects", () => {
      // Object with both error and value (should still be considered error)
      assert.strictEqual(
        isErrorResult({ error: "error", value: "value" }),
        true
      );
    });
  });

  describe("resolveFunction", () => {
    it("should handle synchronous functions that succeed", () => {
      const syncFn = () => "sync result";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let finalResult: any;

      const result = resolveFunction(syncFn, (res): string => {
        finalResult = res;
        if ("value" in res) {
          return res.value;
        } else {
          return res.error as string;
        }
      });

      assert.strictEqual(result, "sync result");
      assert.deepStrictEqual(finalResult, { value: "sync result" });
    });

    it("should handle synchronous functions that throw", () => {
      const syncFn = (): never => {
        throw new Error("sync error");
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let finalResult: any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = resolveFunction(syncFn, (res): any => {
        finalResult = res;
        if ("error" in res) {
          return res.error;
        } else {
          return res.value;
        }
      });

      assert(result instanceof Error);
      assert.strictEqual((result as Error).message, "sync error");
      assert(finalResult.error instanceof Error);
      assert.strictEqual(finalResult.error.message, "sync error");
    });

    it("should handle async functions that succeed", async () => {
      const asyncFn = async () => "async result";
      let finalResult: FinishResult<string>;

      const resultPromise = resolveFunction(asyncFn, (res): string => {
        finalResult = res;
        if ("value" in res) {
          return res.value;
        } else {
          return res.error as string;
        }
      });

      assert(resultPromise instanceof Promise);
      const result = await resultPromise;

      assert.strictEqual(result, "async result");
      // @ts-expect-error Testing edge case
      assert.deepStrictEqual(finalResult, { value: "async result" });
    });

    it("should handle async functions that reject", async () => {
      const asyncFn = async (): Promise<TestAny> => {
        throw new Error("async error");
      };
      let finalResult: TestAny = undefined;

      const resultPromise = resolveFunction(
        asyncFn,
        (res: FinishResult<TestAny>) => {
          finalResult = res;
          if ("error" in res) {
            return res.error;
          } else {
            return res.value;
          }
        }
      );

      assert(resultPromise instanceof Promise);
      const result = await resultPromise;

      assert(result instanceof Error);
      assert.strictEqual((result as Error).message, "async error");
      assert(finalResult);
      assert(finalResult.error instanceof Error);
      assert.strictEqual(finalResult.error.message, "async error");
    });

    it("should handle functions that return resolved promises", async () => {
      const promiseFn = () => Promise.resolve("promise result");
      let finalResult: TestAny;

      const resultPromise = resolveFunction(promiseFn, (res): string => {
        finalResult = res;
        if ("value" in res) {
          return res.value;
        } else {
          return res.error as string;
        }
      });

      assert(resultPromise instanceof Promise);
      const result = await resultPromise;

      assert.strictEqual(result, "promise result");
      assert.deepStrictEqual(finalResult, { value: "promise result" });
    });

    it("should handle functions that return rejected promises", async () => {
      const promiseFn = () => Promise.reject(new Error("promise error"));
      let finalResult: TestAny;

      const resultPromise = resolveFunction(promiseFn, (res): TestAny => {
        finalResult = res;
        if ("error" in res) {
          return res.error;
        } else {
          return res.value;
        }
      });

      assert(resultPromise instanceof Promise);
      const result = await resultPromise;

      assert(result instanceof Error);
      assert.strictEqual((result as Error).message, "promise error");
      assert(finalResult.error instanceof Error);
      assert.strictEqual(finalResult.error.message, "promise error");
    });

    it("should preserve return values from final callback", () => {
      const syncFn = () => "original";

      const result = resolveFunction(syncFn, (res): string => {
        if ("value" in res) {
          return "transformed: " + res.value;
        } else {
          return "error: " + res.error;
        }
      });

      assert.strictEqual(result, "transformed: original");
    });

    it("should preserve return values from final callback for async", async () => {
      const asyncFn = async () => "original";

      const resultPromise = resolveFunction(asyncFn, (res): string => {
        if ("value" in res) {
          return "transformed: " + res.value;
        } else {
          return "error: " + res.error;
        }
      });

      const result = await resultPromise;
      assert.strictEqual(result, "transformed: original");
    });
  });

  describe("serialize", () => {
    it("should serialize simple values", () => {
      const result = serialize("hello", 42, true);
      assert.strictEqual(result, "hello 42 true\n");
    });

    it("should filter out null and undefined values", () => {
      const result = serialize("hello", null, "world", undefined, 42);
      assert.strictEqual(result, "hello world 42\n");
    });

    it("should handle empty arguments", () => {
      const result = serialize();
      assert.strictEqual(result, "\n");
    });

    it("should handle all null/undefined arguments", () => {
      const result = serialize(null, undefined, null);
      assert.strictEqual(result, "\n");
    });

    it("should serialize objects using inspect", () => {
      const obj = { key: "value", number: 123 };

      const result = serialize("Object:", obj);
      assert(result.includes("Object:"));
      assert(result.includes("key"));
      assert(result.includes("value"));
      assert(result.includes("123"));
      assert(result.endsWith("\n"));
    });

    it("should serialize arrays using inspect", () => {
      const arr = [1, 2, "three"];

      const result = serialize("Array:", arr);
      assert(result.includes("Array:"));
      assert(result.includes("1"));
      assert(result.includes("2"));
      assert(result.includes("three"));
      assert(result.endsWith("\n"));
    });

    it("should convert non-object primitives to strings", () => {
      const result = serialize(42, true, false, "string");
      assert.strictEqual(result, "42 true false string\n");
    });

    it("should handle mixed types", () => {
      const obj = { nested: true };

      const result = serialize("prefix", 123, obj, "suffix");
      assert(result.includes("prefix"));
      assert(result.includes("123"));
      assert(result.includes("nested"));
      assert(result.includes("suffix"));
      assert(result.endsWith("\n"));
    });

    it("should respect inspect options colors", () => {
      const colorOptions = { colors: true, depth: 1 };
      const noColorOptions = { colors: false, depth: 1 };
      const obj = { key: "value" };

      const colorResult = serialize(colorOptions, obj);
      const noColorResult = serialize(noColorOptions, obj);

      // Both should contain the same basic content
      assert(colorResult.includes("key"));
      assert(noColorResult.includes("key"));
      assert(colorResult.endsWith("\n"));
      assert(noColorResult.endsWith("\n"));
    });

    it("should handle special values", () => {
      const result = serialize(0, "", false, NaN, Infinity);
      assert.strictEqual(result, "0  false NaN Infinity\n");
    });

    it("should handle functions", () => {
      const fn = function testFunction() {
        return "test";
      };

      const result = serialize("Function:", fn);
      assert(result.includes("Function:"));
      assert(result.includes("function") || result.includes("[Function"));
      assert(result.endsWith("\n"));
    });

    it("should handle Error objects", () => {
      const error = new Error("Test error message");

      const result = serialize("Error:", error);
      assert(result.includes("Error:"));
      assert(result.includes("Error"));
      assert(result.includes("Test error message"));
      assert(result.endsWith("\n"));
    });

    it("should handle Date objects", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");

      const result = serialize("Date:", date);
      assert(result.includes("Date:"));
      assert(result.includes("2024"));
      assert(result.endsWith("\n"));
    });

    it("should handle RegExp objects", () => {
      const regex = /test\d+/gi;

      const result = serialize("Regex:", regex);
      assert(result.includes("Regex:"));
      assert(result.includes("test"));
      assert(result.endsWith("\n"));
    });

    it("should handle circular references gracefully", () => {
      const obj: TestAny = { name: "circular" };
      obj.self = obj;

      const result = serialize("Circular:", obj);
      assert(result.includes("Circular:"));
      assert(result.includes("circular"));
      assert(result.endsWith("\n"));
      // Should not throw or cause infinite loop
    });

    it("should join multiple arguments with spaces", () => {
      const result = serialize("a", "b", "c", "d");
      assert.strictEqual(result, "a b c d\n");
    });

    it("should handle symbols", () => {
      const sym = Symbol("test");

      const result = serialize("Symbol:", sym);
      assert(result.includes("Symbol:"));
      assert(result.includes("Symbol"));
      assert(result.endsWith("\n"));
    });

    it("should handle BigInt", () => {
      const bigint = BigInt("123456789012345678901234567890");

      const result = serialize("BigInt:", bigint);
      assert(result.includes("BigInt:"));
      assert(result.includes("123456789012345678901234567890"));
      assert(result.endsWith("\n"));
    });

    it("should handle Map objects", () => {
      const map = new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);

      const result = serialize("Map:", map);
      assert(result.includes("Map:"));
      assert(result.includes("Map"));
      assert(result.endsWith("\n"));
    });

    it("should handle Set objects", () => {
      const set = new Set(["value1", "value2", "value3"]);

      const result = serialize("Set:", set);
      assert(result.includes("Set:"));
      assert(result.includes("Set"));
      assert(result.endsWith("\n"));
    });

    it("should handle Buffer objects", () => {
      const buffer = Buffer.from("hello world", "utf8");

      const result = serialize("Buffer:", buffer);
      assert(result.includes("Buffer:"));
      assert(result.includes("Buffer"));
      assert(result.endsWith("\n"));
    });

    it("should maintain consistent output format", () => {
      // Multiple calls with same input should produce same output
      const input = ["same", 123, { key: "value" }];
      const result1 = serialize(...input);
      const result2 = serialize(...input);

      assert.strictEqual(result1, result2);
    });

    it("should always end with newline", () => {
      const results = [
        serialize("test"),
        serialize("test", "test"),
        serialize("test", { key: "value" }),
        serialize(null, undefined),
        serialize("a", "b", "c"),
      ];

      for (const result of results) {
        assert(result.endsWith("\n"));
      }
    });
  });
});
