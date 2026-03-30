import type { BabelTransformer } from "metro-babel-transformer";
import * as path from "node:path";

let transformer: Required<BabelTransformer>;

export function findReactNativeTransformer(projectRoot = process.cwd()) {
  if (!transformer) {
    const metroConfigPath = path.dirname(
      require.resolve("@react-native/metro-config/package.json", {
        paths: [projectRoot],
      })
    );
    const transformerPath = require.resolve(
      "@react-native/metro-babel-transformer",
      { paths: [metroConfigPath] }
    );
    transformer = require(transformerPath);
  }
  return transformer;
}
