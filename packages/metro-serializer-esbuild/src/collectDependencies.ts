import type { File, SourceLocation } from "@babel/types";

type AsyncDependencyType = "async" | "prefetch";

type DependencyData<TSplitCondition> = Readonly<{
  asyncType: AsyncDependencyType | null;
  isOptional?: boolean;
  splitCondition?: TSplitCondition;
  locs: Array<SourceLocation>;
}>;

type Dependency<TSplitCondition> = Readonly<{
  data: DependencyData<TSplitCondition>;
  name: string;
}>;

type CollectedDependencies<TSplitCondition> = Readonly<{
  ast: File;
  dependencyMapName: string;
  dependencies: ReadonlyArray<Dependency<TSplitCondition>>;
}>;

type Options = Record<string, unknown>;

/**
 * Pass-through replacement for the `collectDependencies` function called by the
 * default Metro transform worker. Metro's implementation rewrites import/export
 * statements to use their `require` polyfill. Our implementation preserves them
 * so esbuild can perform tree shaking.
 *
 * Requires `transformer.unstable_collectDependencies` that was added in
 * https://github.com/facebook/metro/commit/648224146e58bcc5e4a0a072daff34b0c42cafa6.
 *
 * @param ast
 * @param _options
 * @returns
 */
export default function collectDependencies<TSplitCondition = void>(
  ast: File,
  options: Options
): CollectedDependencies<TSplitCondition> {
  const { getDefaultConfig } = require("metro-config");
  const collectDependenciesPath =
    getDefaultConfig().transformer.unstable_collectDependenciesPath;
  if (!collectDependenciesPath) {
    throw new Error(`'transformer.unstable_collectDependenciesPath' is unset`);
  }

  const collectDependencies = require(collectDependenciesPath);
  return collectDependencies(ast, {
    ...options,
    dependencyTransformer: {
      transformSyncRequire: () => void 0,
      transformImportCall: () => void 0,
      transformJSResource: () => void 0,
      transformPrefetch: () => void 0,
      transformIllegalDynamicRequire: () => void 0,
    },
  });
}
