import type { TransformerConfigT } from "metro-config";
import type { TransformerPluginOptions } from "./types";
import { setTransformerPluginOptions } from "./utils";

export function MetroTransformerEsbuild(
  options: TransformerPluginOptions = {},
  config: Partial<TransformerConfigT> = {}
): Partial<TransformerConfigT> {
  // push the options to the environment so they can be accessed by the transformer
  setTransformerPluginOptions(options);

  // now set the babelTransformerPath to our custom transformer
  return {
    ...config,
    babelTransformerPath: require.resolve("./babelTransformer"),
  };
}
