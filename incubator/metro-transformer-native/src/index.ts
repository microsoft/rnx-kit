import type { TransformerConfigT } from "metro-config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTransformerPluginOptions } from "./context.ts";
import type { TransformerOptions } from "./types.ts";

// @ts-expect-error -- support both cjs and esm
const thisFile = __filename ?? fileURLToPath(import.meta.url);
const thisDir = path.dirname(thisFile);
const extension = path.extname(thisFile);

export function MetroTransformerNative(
  options: Partial<TransformerOptions> = {},
  config: Partial<TransformerConfigT> = {}
): Partial<TransformerConfigT> {
  // push the options to the environment so they can be accessed by the transformer
  setTransformerPluginOptions(options);

  // now set the babelTransformerPath to our custom transformer
  return {
    ...config,
    babelTransformerPath: path.join(thisDir, "babelTransformer" + extension),
  };
}

export { transform, getCacheKey } from "./babelTransformer.ts";

export type {
  NativeTarget,
  TransformerNativeOptions,
  TransformerOptions,
  TransformerModule,
  SourceTransformResult,
  SourceTransformer,
  UpstreamDelegate,
  UpstreamTransformer,
  SrcType,
} from "./types.ts";
