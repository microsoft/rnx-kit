import { ESLint, type Linter } from "eslint";
import eslintFormatterPretty from "eslint-formatter-pretty";
import micromatch from "micromatch";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

type LinterConfig = Linter.Config<Linter.RulesRecord>;

export type LintTarget = {
  /**
   * The directory to lint
   */
  cwd: string;

  /**
   * Specific files to lint. If not specified, files will be found using settings in the configuration
   */
  files?: string[];

  /**
   * Automatically fix the issues as part of linting
   * @default false
   */
  fix?: boolean;
};

export type LintConfiguration = {
  /**
   * Ignore warnings, only show errors
   * @default false
   */
  warnIgnored?: boolean;

  /**
   * File patterns to use for linting. Files are found using git ls-files
   */
  filePatterns: string[];

  /**
   * Glob ignore patterns to use for linting, will be run against the file list before sending the
   * files to eslint.
   */
  globalIgnores?: string[];

  /**
   * Ignore patterns to use for linting, will be sent to eslint
   */
  ignorePatterns?: string[];

  /**
   * Fallback configuration to use if no local config is found in the directory
   */
  fallbackConfig?: string | LinterConfig | LinterConfig[];
};

export type LintOptions = LintConfiguration & LintTarget;

/**
 * @type {LintOptions}
 */
export const defaultLintConfig = {
  filePatterns: ["*.cjs", "*.js", "*.jsx", "*.mjs", "*.ts", "*.tsx"],
  globalIgnores: ["**/node_modules/", ".git/"],
  warnIgnored: false,
};

/**
 * Run eslint in the specified directory
 * @param {string} cwd
 * @param {LintOptions} options
 * @returns {Promise<number | void>}
 */
export async function runLint(options: LintOptions): Promise<number | void> {
  const { cwd, fix, warnIgnored, ignorePatterns = [] } = options;

  // load the config file values, need to have either a local config or a default to proceed
  const [overrideConfigFile, overrideConfig] = await loadConfig(options);
  if (!overrideConfigFile && !overrideConfig) {
    console.log(`No lint config file provided for ${cwd}. Skipping lint.`);
    return;
  }

  // create the eslint instance
  const eslint = new ESLint({
    cwd,
    fix,
    ignorePatterns,
    warnIgnored,
    overrideConfigFile,
    overrideConfig,
  });

  const files = options.files ?? findFiles(options);
  const results = await eslint.lintFiles(files);
  await ESLint.outputFixes(results);

  const output = eslintFormatterPretty(results);

  if (output) {
    if (ESLint.getErrorResults(results).length > 0) {
      console.error(output);
      return 1;
    }

    console.log(output);
  }
}

/**
 * load the config settings for the specified directory
 */
export async function loadConfig(
  options: LintOptions
): Promise<
  [string | boolean | undefined, LinterConfig | LinterConfig[] | undefined]
> {
  const { fallbackConfig, cwd } = options;

  // default to the local config in cwd if it exists
  const eslintConfigPath = path.join(cwd, "eslint.config.js");
  if (fs.existsSync(eslintConfigPath)) {
    return [eslintConfigPath, undefined];
  }

  // fall back to defaultConfig if it is specified
  if (fallbackConfig) {
    if (typeof fallbackConfig === "string") {
      return [fallbackConfig, undefined];
    }
    return [true, fallbackConfig];
  }

  // no local, no default, return undefined
  return [undefined, undefined];
}

/**
 * Use git's ls-files to find files in the specified directory matching the filePatterns
 */
export function findFiles(options: LintOptions) {
  const { cwd, filePatterns = [], globalIgnores = [] } = options;

  // use git to list the files in the directory
  const { stdout } = spawnSync("git", ["ls-files", ...filePatterns], {
    cwd,
  });
  const files = stdout.toString().trim().split("\n");
  // filter the result if any global ignores are specified
  return globalIgnores.length > 0
    ? files.filter((file) => !micromatch.isMatch(file, globalIgnores))
    : files;
}
