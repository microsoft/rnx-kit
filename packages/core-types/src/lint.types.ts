// Types for linting rules are defined here to avoid circular dependency:
// @rnx-kit/lint-lockfile --> @rnx-kit/config --> @rnx-kit/lint-lockfile

export type RuleBaseOptions = {
  /**
   * Whether to enable this rule.
   * @default true
   */
  enabled?: boolean;
};

export type NoDuplicatesRuleOptions = RuleBaseOptions & {
  /**
   * List of packages to check for duplicates.
   *
   * Each package can be specified as a string or as a tuple of
   * `[name, maxCount]`. If provided, `maxCount` indicates how many times the
   * package can appear. Otherwise, the package can only appear once.
   *
   * An empty array or `undefined` disables the rule.
   *
   * @example
   * ```ts
   * "no-duplicates": {
   *   "packages": [
   *     "react-native", // allows only 1 instance of "react-native"
   *     ["react", 2], // allows up to 2 instances of "react"
   *     ["left-pad", 0], // disallows "left-pad" completely
   *   ],
   * }
   * ```
   */
  packages?: readonly (string | readonly [string, number])[];
};

export type NoWorkspacePackageFromNpmRuleOptions = RuleBaseOptions;
