import type { BabelTransformer } from "metro-babel-transformer";
import { equal } from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";

describe("metro-transformer-oxc", () => {
  const globalRequire = global.require;

  before(() => {
    const index = new URL("../src/index.ts", import.meta.url);
    global.__filename = fileURLToPath(index);
    global.require = createRequire(index);
  });

  after(() => {
    global.__filename = undefined;
    global.require = globalRequire;
  });

  it("exports the shape expected by Metro", async () => {
    const transformer = await import("../src/index.ts");

    const transform: BabelTransformer["transform"] = transformer.transform;
    const getCacheKey: BabelTransformer["getCacheKey"] =
      transformer.getCacheKey;

    equal(typeof getCacheKey, "function");
    equal(typeof transform, "function");
  });
});
