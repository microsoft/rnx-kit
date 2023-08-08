import * as path from "path";
import { getDependencyPolyfills } from "./dependency";
import type { Context, GetPreludeModules } from "./types";

/**
 * Ideally, we'd need something between `serializer.getPolyfills` and
 * `serializer.getModulesRunBeforeMainModule`. The former does not have access
 * to `require`, while the latter requires that the listed modules are
 * explicitly used in the bundle itself (see
 * https://github.com/facebook/metro/issues/850). For now, we will use this fact
 * to simply list all prelude modules.
 */
function defaultModules({ projectRoot }: Context): string[] {
  const platforms = [
    "react-native",
    "react-native-macos",
    "react-native-windows",
  ];
  const options = { paths: [projectRoot] };

  const modules = [];
  for (const platform of platforms) {
    const core = `${platform}/Libraries/Core/InitializeCore`;
    try {
      modules.push(require.resolve(core, options));
    } catch (_) {
      // ignore
    }
  }

  return modules;
}

export const getPreludeModules: GetPreludeModules = () => {
  const context = { projectRoot: process.cwd() };
  const modules = defaultModules(context);
  const dependencyPolyfills = getDependencyPolyfills(context);
  return modules.concat(dependencyPolyfills);
};

export default getPreludeModules;
