// @ts-check

import { includeIgnoreFile } from "@eslint/compat";
import { ESLint } from "eslint";
import eslintFormatterPretty from "eslint-formatter-pretty";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @typedef {import("eslint").Linter.RulesRecord} RulesRecord
 * @typedef {import("eslint").Linter.Config<RulesRecord>} LinterConfig
 */

/**
 * @typedef LintOptions
 * @type {object}
 * @property {string | undefined} [root] - Root path of the repository, if not set the root .gitignore will not be parsed meaning
 * the ignore patterns should be set manually.
 * @property {boolean | undefined} [fix] - Automatically attempt to fix errors
 * @property {boolean | undefined} [warnIgnored] - Ignore warnings, defaults to false
 * @property {string[] | undefined} [files] - Files to lint, if not provided files will be found using filePatterns
 * @property {string[] | undefined} [filePatterns] - File patterns used to look up files to lint. Obtained via running git ls-files
 * @property {string[] | undefined} [globalIgnores] - Global ignore patterns to use for the lint call
 * @property {string[] | undefined} [ignorePatterns] - Ignore patterns for the lint call, if not provided ignore patterns will be determined
 * @property {boolean | undefined} [skipGitIgnore] - Skip looking up .gitignore files in the root and the current working directory for ignore patterns
 * by looking up .gitignore files in the root and the current working directory
 * @property {string | LinterConfig | LinterConfig[] | undefined} [defaultConfig] - Default config to use if no local config is found. This can either be a path to a config file, or
 * a loaded LinterConfig object. If not provided lint will be skipped if no local config is found
 */

/**
 * @type {LintOptions}
 */
export const defaultLintOptions = {
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
export async function runLint(cwd, options) {
  const { fix, warnIgnored } = options;

  // load the config file values, need to have either a local config or a default to proceed
  const [overrideConfigFile, overrideConfig] = await loadConfig(cwd, options);
  if (!overrideConfigFile && !overrideConfig) {
    console.log(`No lint config file provided for ${cwd}. Skipping lint.`);
    return;
  }

  // load the ignore patterns, either what was specified directly or what was found in the .gitignore files
  const ignorePatterns = getIgnorePatterns(cwd, options);

  // create the eslint instance
  const eslint = new ESLint({
    cwd,
    fix,
    ignorePatterns,
    warnIgnored,
    overrideConfigFile,
    overrideConfig,
  });

  const files = findFiles(cwd, options);
  console.log("Linting files:", files);
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
 * @param {string} cwd
 * @param {LintOptions} options
 * @returns {Promise<[string | boolean | undefined, LinterConfig | LinterConfig[] | undefined]>}
 */
export async function loadConfig(cwd, options) {
  const { defaultConfig } = options;

  // default to the local config in cwd if it exists
  const eslintConfigPath = path.join(cwd, "eslint.config.js");
  if (fs.existsSync(eslintConfigPath)) {
    return [eslintConfigPath, undefined];
  }

  // fall back to defaultConfig if it is specified
  if (defaultConfig) {
    if (typeof defaultConfig === "string") {
      return [defaultConfig, undefined];
    }
    return [true, defaultConfig];
  }

  // no local, no default, return undefined
  return [undefined, undefined];
}

/**
 * @param {string} cwd
 * @param {LintOptions} options
 * @returns {string[]}
 */
export function getIgnorePatterns(cwd, options) {
  const patterns = [...(options.globalIgnores || [])];
  if (options.ignorePatterns) {
    patterns.push(...options.ignorePatterns);
  }

  if (!options.skipGitIgnore) {
    const locations = options.root ? [options.root, cwd] : [cwd];
    for (const location of locations) {
      const gitignore = path.join(location, ".gitignore");
      if (fs.existsSync(gitignore)) {
        const { ignores } = includeIgnoreFile(gitignore);
        if (ignores) {
          patterns.push(...ignores);
        }
      }
    }
  }

  return patterns;
}

/**
 * @param {string} cwd
 * @param {LintOptions} options
 * @returns {string[]}
 */
export function findFiles(cwd, options) {
  if (options.files) {
    return options.files;
  }
  const filePatterns = options.filePatterns || [];
  const { stdout } = spawnSync("git", ["ls-files", ...filePatterns], {
    cwd,
  });
  return stdout.toString().trim().split("\n");
}
