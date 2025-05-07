// @ts-check

import { includeIgnoreFile } from "@eslint/compat";
import { ESLint, type Linter } from "eslint";
import eslintFormatterPretty from "eslint-formatter-pretty";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

type LinterConfig = Linter.Config<Linter.RulesRecord>;

export type LintOptions = {
  root?: string;
  fix?: boolean;
  warnIgnored?: boolean;
  files?: string[];
  filePatterns?: string[];
  globalIgnores?: string[];
  ignorePatterns?: string[];
  skipGitIgnore?: boolean;
  defaultConfig?: string | LinterConfig | LinterConfig[];
};

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
export async function runLint(
  cwd: string,
  options: LintOptions
): Promise<number | void> {
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
export async function loadConfig(
  cwd: string,
  options: LintOptions
): Promise<
  [string | boolean | undefined, LinterConfig | LinterConfig[] | undefined]
> {
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
 */
export function getIgnorePatterns(cwd: string, options: LintOptions) {
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
export function findFiles(cwd: string, options: LintOptions) {
  if (options.files) {
    return options.files;
  }
  const filePatterns = options.filePatterns || [];
  const { stdout } = spawnSync("git", ["ls-files", ...filePatterns], {
    cwd,
  });
  return stdout.toString().trim().split("\n");
}
