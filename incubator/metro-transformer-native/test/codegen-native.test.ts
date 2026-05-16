import type { BabelFileResult } from "@babel/core";
import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createFixtureArgs, requireSourceModule } from "./helpers.ts";

const { __testOnlyGetLastContext, transform } = requireSourceModule<
  typeof import("../src/babelTransformer.ts")
>("../src/babelTransformer.ts");
const { setTransformerPluginOptions } = requireSourceModule<
  typeof import("../src/context.ts")
>("../src/context.ts");

describe("codegenNativeComponent detection", () => {
  beforeEach(() => setTransformerPluginOptions({}));

  it("bypasses SWC for files that actually call codegenNativeComponent (tightened pattern matches)", () => {
    const result = transform(
      createFixtureArgs("codegen-native.ts")
    ) as BabelFileResult;
    ok(result.ast != null);
    const ctx = __testOnlyGetLastContext();
    ok(ctx != null, "expected the last context to be captured");
    // Tightened regex matches `codegenNativeComponent<NativeProps>(...)` and
    // disables the native (SWC) pre-pass so babel can run the codegen plugin.
    equal(ctx!.nativeTransform, false);
  });

  it("does NOT bypass SWC for files where the substring appears in a comment only (no call/generic-arg follow-on)", () => {
    const result = transform(
      createFixtureArgs("codegen-false-positive.ts")
    ) as BabelFileResult;
    ok(result.ast != null);
    const ctx = __testOnlyGetLastContext();
    ok(ctx != null, "expected the last context to be captured");
    // The regex requires `\bcodegenNativeComponent\s*[(<]`, so a substring
    // mention in a comment / string literal does not match and the file still
    // goes through the native (SWC) pre-pass.
    equal(ctx!.nativeTransform, true);
  });
});
