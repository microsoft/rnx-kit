import type { TransformerConfigT } from "metro-config";
import { setTransformerPluginOptions } from "./context";
import type { TransformerOptions } from "./types";

export function MetroTransformerNative(
  options: Partial<TransformerOptions> = {},
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
