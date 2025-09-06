import assert from "node:assert";
import { describe, it } from "node:test";
import type { FinishResult } from "../src/types.ts";
import { isErrorResult, lazyInit, resolveFunction } from "../src/utils.ts";

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
      assert.strictEqual(isErrorResult({ error: undefined }), false);
    });

    it("should return false for success results", () => {
      assert.strictEqual(isErrorResult({ value: "success" }), false);
      assert.strictEqual(isErrorResult({ value: 42 }), false);
      assert.strictEqual(isErrorResult({ value: null }), false);
      assert.strictEqual(isErrorResult({ value: undefined }), false);
    });

    it("should return false for undefined/null inputs", () => {
      assert.strictEqual(isErrorResult(undefined), false);
      assert.strictEqual(isErrorResult(null as any), false);
    });

    it("should return false for empty objects", () => {
      assert.strictEqual(isErrorResult({} as any), false);
    });

    it("should handle mixed objects", () => {
      // Object with both error and value (should still be considered error)
      assert.strictEqual(
        isErrorResult({ error: "error", value: "value" } as any),
        true
      );
    });
  });

  describe("resolveFunction", () => {
    it("should handle synchronous functions that succeed", () => {
      const syncFn = () => "sync result";
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
      let finalResult: any;

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
      let finalResult: any;

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
      assert.deepStrictEqual(finalResult, { value: "async result" });
    });

    it("should handle async functions that reject", async () => {
      const asyncFn = async (): Promise<string> => {
        throw new Error("async error");
      };
      let finalResult: any;

      const resultPromise = resolveFunction(
        asyncFn,
        (res: FinishResult<unknown>) => {
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
      assert(finalResult.error instanceof Error);
      assert.strictEqual(finalResult.error.message, "async error");
    });

    it("should handle functions that return resolved promises", async () => {
      const promiseFn = () => Promise.resolve("promise result");
      let finalResult: any;

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
      let finalResult: any;

      const resultPromise = resolveFunction(promiseFn, (res): any => {
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
});
