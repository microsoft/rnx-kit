import type { BuildOptions } from "esbuild";

/**
 * Options for @rnx-kit/metro-serializer-esbuild plugin.
 */
export type SerializerEsbuildOptions = Pick<
  BuildOptions,
  | "drop"
  | "logLevel"
  | "minify"
  | "minifyWhitespace"
  | "minifyIdentifiers"
  | "minifySyntax"
  | "pure"
  | "target"
> & {
  analyze?: boolean | "verbose";
  fabric?: boolean;
  metafile?: string;
  sourceMapPaths?: "absolute" | "relative";
  strictMode?: boolean;
};
