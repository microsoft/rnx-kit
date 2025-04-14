import { includeIgnoreFile } from "@eslint/compat";
import { ESLint } from "eslint";
import * as formatter from "eslint-formatter-pretty";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @typedef {import("./lint.d.ts").LintOptions} LintOptions
 */

/**
 * @type {Partial<LintOptions>}
 */
export const defaultLintOptions = {
  filePatterns: ["*.cjs", "*.js", "*.jsx", "*.mjs", "*.ts", "*.tsx"],
  warnIgnored: false,
};

/**
 * Run eslint in the specified directory
 * @param {LintOptions} options
 * @returns {number}
 */
export async function lint(options) {
  const { fix, cwd, warnIgnored } = options;

  // load the config file values, need to have either a local config or a default to proceed
  const [overrideConfigFile, overrideConfig] = await loadConfig(cwd, options);
  if (!overrideConfigFile && !overrideConfig) {
    console.log(`No lint config file provided for ${cwd}. Skipping lint.`);
    return 0;
  }

  // load the ignore patterns, either what was specified directly or what was found in the .gitignore files
  const ignorePatterns = getIgnorePatterns(options);

  // create the eslint instance
  const eslint = new ESLint({
    cwd,
    fix,
    ignorePatterns,
    warnIgnored,
    overrideConfigFile,
    overrideConfig,
  });

  const files = findFiles(options);
  const results = await eslint.lintFiles(files);
  await ESLint.outputFixes(results);

  const output = formatter.format(results);

  if (output) {
    if (ESLint.getErrorResults(results).length > 0) {
      console.error(output);
      return 1;
    }

    console.log(output);
  }

  return 0;
}

/**
 * load the config settings for the specified directory
 * @param {LintOptions} options
 */
async function loadConfig(options) {
  const { cwd, defaultConfig } = options;

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
 * @param {LintOptions} options
 * @returns {string[]}
 */
function getIgnorePatterns(options) {
  if (options.ignorePatterns) {
    return options.ignorePatterns;
  }

  const patterns = [];
  const locations = options.root ? [options.root, options.cwd] : [options.cwd];
  for (const location of locations) {
    const gitignore = path.join(location, ".gitignore");
    if (fs.existsSync(gitignore)) {
      const { ignores } = includeIgnoreFile(gitignore);
      if (ignores) {
        patterns.push(...ignores);
      }
    }
  }

  return patterns;
}

/**
 *
 * @param {LintOptions} options
 * @returns {string[]}
 */
function findFiles(options) {
  if (options.files) {
    return options.files;
  }
  const { stdout } = spawnSync("git", ["ls-files", ...options.filePatterns], {
    cwd: options.cwd,
  });
  return stdout.toString().trim().split("\n");
}
