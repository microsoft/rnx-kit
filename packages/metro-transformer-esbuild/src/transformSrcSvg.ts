import type { resolveConfig, transform } from "@svgr/core";
import path from "node:path";
import type { TransformerArgs } from "./types";

/**
 * Default config for svgr, this matches what is in react-native-svg-transformer.
 */
const defaultSVGRConfig = {
  native: true,
  plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
  svgoConfig: {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            inlineStyles: {
              onlyMatchedOnce: false,
            },
            removeViewBox: false,
            removeUnknownsAndDefaults: false,
            convertColors: false,
          },
        },
      },
    ],
  },
};

type SvgHelpers = {
  resolveConfig: typeof resolveConfig;
  transform: typeof transform;
};

/**
 * Dynamically load the required functions from @svgr/core. This is done to avoid loading this dependency and its own
 * dependencies unnecessarily when not transforming svg files, as well as to allow the use of the optional peer dependencies
 * of @svgr/core to be used by the project using this transformer.
 */
const svgHelpers = (() => {
  let helpers: SvgHelpers | undefined = undefined;
  return async () => {
    if (!helpers) {
      const svgrCore = await import("@svgr/core");
      helpers = {
        resolveConfig: svgrCore.resolveConfig,
        transform: svgrCore.transform,
      };
    }
    return helpers;
  };
})();

/**
 * Transform an svg file into jsx using @svgr/core. This is used by the babel transformer to transform svg files when
 * requested in the options. Note that the optional peer dependencies for @svgr/core, @svgr/plugin-svgo and @svgr/plugin-jsx,
 * must be installed in the project for this to work.
 *
 * @param src source to be transformed
 * @param filename name of the file to be transformed
 * @returns svg transformed into jsx
 */
export async function transformSrcSvg({
  src,
  filename,
}: TransformerArgs): Promise<string> {
  const { resolveConfig, transform } = await svgHelpers();
  const config = await resolveConfig(path.dirname(filename));
  const svgrConfig = config
    ? { ...defaultSVGRConfig, ...config }
    : defaultSVGRConfig;
  return transform(src, svgrConfig, { filePath: filename });
}
