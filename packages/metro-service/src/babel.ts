import { warn } from "@rnx-kit/console";
import * as fs from "fs";
import type { ConfigT } from "metro-config";
import * as path from "path";

export function ensureBabelConfig({ projectRoot }: ConfigT): void {
  // Even though Babel supports more file extensions
  // (https://babeljs.io/docs/config-files#supported-file-extensions),
  // `@react-native/metro-babel-transformer` only supports the following. See
  // https://github.com/facebook/react-native/blob/5eaf28b247fc66b46520a26271bdcded9d4d2338/packages/react-native-babel-transformer/src/index.js#L53.
  const extensions = [".babelrc", ".babelrc.js", "babel.config.js"];

  const projectBabelRC = extensions.some((rc) => {
    return fs.existsSync(path.join(projectRoot, rc));
  });

  if (projectBabelRC) {
    return;
  }

  const cwd = process.cwd();
  for (const ext of extensions) {
    const babelRC = path.join(cwd, ext);
    if (fs.existsSync(babelRC)) {
      const rel = path.relative(cwd, projectRoot);
      warn(
        [
          `Could not find Babel config in '${rel}' but did find one in the`,
          "current working directory. Metro will not be able to find this",
          "file. If this is unexpected, please make sure you've configured",
          "'projectRoot' correctly. If you set 'projectRoot' to fix how the",
          "bundle is served, consider adding a root 'index.js' that imports",
          `'${rel}/index' instead.`,
        ].join(" ")
      );
      break;
    }
  }
}
