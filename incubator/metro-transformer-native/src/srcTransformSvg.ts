import type { Config } from "@svgr/core";
import path from "node:path";
import type { SourceTransformResult, TransformerArgs } from "./types";
import { optionalModule } from "./utils";

export const svgCore =
  optionalModule<typeof import("@svgr/core")>("@svgr/core");

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

function getSvgrConfig(found: Config | null): Config {
  return found ? { ...defaultSVGRConfig, ...found } : defaultSVGRConfig;
}

/**
 * Transform an svg file into jsx using @svgr/core. This is used by the babel transformer to transform svg files when
 * requested in the options. Note that the optional peer dependencies for @svgr/core, @svgr/plugin-svgo and @svgr/plugin-jsx,
 * must be installed in the project for this to work.
 *
 * @param src source to be transformed
 * @param filename name of the file to be transformed
 * @returns svg transformed into jsx
 */
export function srcTransformSvg({
  src,
  filename,
  pluginOptions,
}: TransformerArgs): SourceTransformResult | Promise<SourceTransformResult> {
  const { resolveConfig, transform } = svgCore.get();
  const { asyncTransform, trace } = pluginOptions;
  const opConfig = "transform src svg config";
  const opTransform = "transform src svg transform";
  if (asyncTransform) {
    return trace(opConfig, resolveConfig, path.dirname(filename)).then(
      (found: Config | null) => {
        const svgrConfig = getSvgrConfig(found);
        return trace(opTransform, transform, src, svgrConfig, {
          filePath: filename,
        }).then((code: string) => ({ code }));
      }
    );
  } else {
    const config = trace(opConfig, resolveConfig.sync, path.dirname(filename));
    const svgrConfig = getSvgrConfig(config);
    const code = trace(opTransform, transform.sync, src, svgrConfig, {
      filePath: filename,
    });
    return { code };
  }
}
