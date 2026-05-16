import type { BabelFileResult } from "@babel/core";
import { ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createFixtureArgs, requireSourceModule } from "./helpers.ts";

const { transform } = requireSourceModule<
  typeof import("../src/babelTransformer.ts")
>("../src/babelTransformer.ts");
const { setTransformerPluginOptions } = requireSourceModule<
  typeof import("../src/context.ts")
>("../src/context.ts");

describe("Flow handling", () => {
  beforeEach(() => setTransformerPluginOptions({}));

  it("processes Flow-typed JS files without crashing under default options", () => {
    const result = transform(
      createFixtureArgs("flow-typed.js")
    ) as BabelFileResult;
    ok(result.ast != null);
  });

  it("processes Flow-typed JS files without crashing when handleJs is true (SWC falls through to babel)", () => {
    setTransformerPluginOptions({ handleJs: true });
    const result = transform(
      createFixtureArgs("flow-typed.js")
    ) as BabelFileResult;
    ok(result.ast != null);
  });
});
