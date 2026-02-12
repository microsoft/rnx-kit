/**
 * Options for @rnx-kit/metro-plugin-cyclic-dependencies-detector plugin.
 */
export type CyclicDependencyPluginOptions = {
  includeNodeModules?: boolean;
  linesOfContext?: number;
  throwOnError?: boolean;
};
