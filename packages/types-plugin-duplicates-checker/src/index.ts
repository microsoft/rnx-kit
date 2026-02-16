/**
 * Options for @rnx-kit/metro-plugin-duplicates-checker plugin.
 */
export type DuplicateDetectorPluginOptions = {
  ignoredModules?: readonly string[];
  bannedModules?: readonly string[];
  throwOnError?: boolean;
};
