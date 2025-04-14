import type { Linter } from "eslint";

export type LinterConfig = Linter.Config<Linter.RulesRecord>;

/**
 * Options for the lint command
 */
export type LintOptions = {
  /**
   * Working directory for the lint call
   */
  cwd: string;

  /**
   * Root path of the repository, if not set the root .gitignore will not be parsed meaning
   * the ignore patterns should be set manually.
   */
  root?: string;

  /**
   * Automatically attempt to fix errors
   */
  fix?: boolean;

  /**
   * Ignore warnings, defaults to false
   */
  warnIgnored?: boolean;

  /**
   * Files to lint, if not provided files will be found using filePatterns
   */
  files?: string[];

  /**
   * File patterns used to look up files to lint. Obtained via running git ls-files
   */
  filePatterns?: string[];

  /**
   * Ignore patterns for the lint call, if not provided ignore patterns will be determined
   * by looking up .gitignore files in the root and the current working directory
   */
  ignorePatterns?: string[];

  /**
   * Default config to use if no local config is found. This can either be a path to a config file, or
   * a loaded LinterConfig object. If not provided lint will be skipped if no local config is found
   */
  defaultConfig?: string | LinterConfig;
};
