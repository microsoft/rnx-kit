/**
 * Wraps `@rnx-kit/metro-transformer-native`'s `transform()` (the function
 * exported from src/babelTransformer.ts) for the bench harness.
 *
 * The harness imports the compiled `lib/` rather than the TS source so that
 * the numbers reflect the same code path Metro would load in a real project.
 *
 * NOTE: we deliberately do NOT call `getCacheKey()` here. Per slice 05's
 * plan, cache key computation is Metro's concern, and the standalone helper
 * in the current implementation is hash-the-package-contents heavy. Calling
 * it would dominate the warm-loop measurements and (pre-slice-00) also
 * trip a known crash path.
 */

import { createRequire } from "node:module";
import type { Transformer } from "./baseline.ts";

const require = createRequire(import.meta.url);

export function loadNativeTransformer(
  options: Record<string, unknown> = {}
): Transformer {
  // Push options through the env-var serialization the transformer expects.
  const ctx = require("../lib/context.js") as {
    setTransformerPluginOptions: (o: Record<string, unknown>) => void;
  };
  ctx.setTransformerPluginOptions(options);
  const mod = require("../lib/babelTransformer.js") as {
    // oxlint-disable-next-line typescript/no-explicit-any
    transform: (args: any) => any;
  };
  return {
    name: "native-swc",
    transform: mod.transform,
  };
}
