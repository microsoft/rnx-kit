/**
 * Wraps the upstream `@react-native/metro-babel-transformer` so the bench
 * harness sees a single uniform `transform(args)` shape across transformers.
 *
 * Intentionally NOT importing types from the upstream package — the bench
 * code does not type-check against Metro's internals, it just measures
 * call-time. Types are pinned to `any` and cast at the boundary.
 */

import { createRequire } from "node:module";

// oxlint-disable-next-line typescript/no-explicit-any
type TransformerArgs = any;
// oxlint-disable-next-line typescript/no-explicit-any
type TransformerResult = any;

export type Transformer = {
  name: string;
  transform: (
    args: TransformerArgs
  ) => TransformerResult | Promise<TransformerResult>;
};

const require = createRequire(import.meta.url);

export function loadBaselineTransformer(): Transformer {
  const mod = require("@react-native/metro-babel-transformer") as {
    transform: (args: TransformerArgs) => TransformerResult;
  };
  return {
    name: "baseline-rn",
    transform: mod.transform,
  };
}
