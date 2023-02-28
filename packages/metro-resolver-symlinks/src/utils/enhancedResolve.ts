import { isPackageModuleRef, parseModuleRef } from "@rnx-kit/tools-node/module";
import { expandPlatformExtensions } from "@rnx-kit/tools-react-native/platform";
import type {
  CustomResolver,
  Resolution,
  ResolutionContext,
} from "metro-resolver";
import * as path from "path";

type Resolver = (fromDir: string, moduleId: string) => string | false;

const getEnhancedResolver = (() => {
  const resolvers: Record<string, Resolver> = {};
  return (context: ResolutionContext, platform = "common") => {
    if (!resolvers[platform]) {
      const {
        // @ts-expect-error Property 'mainFields' does not exist on type 'ResolutionContext'
        mainFields,
        sourceExts,
        // @ts-expect-error Property 'unstable_conditionNames' does not exist on type 'ResolutionContext'
        unstable_conditionNames,
        // @ts-expect-error Property 'unstable_enablePackageExports' does not exist on type 'ResolutionContext'
        unstable_enablePackageExports,
      } = context;
      const extensions = sourceExts.map((ext) => `.${ext}`);
      resolvers[platform] = require("enhanced-resolve").create.sync({
        aliasFields: ["browser"],

        // Add `require` to handle packages that are missing `default`
        // conditional. See
        // https://github.com/webpack/enhanced-resolve/issues/313
        conditionNames: unstable_enablePackageExports
          ? unstable_conditionNames
          : ["require", "node"],

        // Unless `unstable_enablePackageExports` is enabled, disable exports
        // map as it currently takes precedence over the `react-native` field.
        ...(unstable_enablePackageExports ? undefined : { exportsFields: [] }),

        extensions:
          platform === "common"
            ? extensions
            : expandPlatformExtensions(platform, extensions),
        mainFields,
      });
    }
    return resolvers[platform];
  };
})();

function getFromDir(context: ResolutionContext, moduleName: string): string {
  const { extraNodeModules, originModulePath } = context;
  if (extraNodeModules) {
    const ref = parseModuleRef(moduleName);
    if (isPackageModuleRef(ref)) {
      const pkgName = ref.scope ? `${ref.scope}/${ref.name}` : ref.name;
      const dir = extraNodeModules[pkgName];
      if (dir) {
        return dir;
      }
    }
  }

  return originModulePath ? path.dirname(originModulePath) : process.cwd();
}

export function applyEnhancedResolver(
  _resolve: CustomResolver,
  context: ResolutionContext,
  moduleName: string,
  platform: string
): Resolution {
  if (!platform) {
    return { type: "empty" };
  }

  const enhancedResolve = getEnhancedResolver(context, platform);
  const filePath = enhancedResolve(getFromDir(context, moduleName), moduleName);
  if (filePath === false) {
    return { type: "empty" };
  }

  return {
    type: "sourceFile",
    filePath,
  };
}
