// @ts-check

import { Command, Option } from "clipanion";
import { defaultLintOptions, runLint } from "../scripts/lint.js";
import { BaseCommand } from "./base-command.js";

/**
 * @typedef {import("../scripts/lint.js").LintOptions} LintOptions
 * @typedef {import("clipanion").Usage} Usage
 */

/**
 * @param {string[]} paths
 * @param {Partial<LintOptions>} options
 * @returns {Usage}
 */
function createUsage(paths, options) {
  const cmdPath = `$0 ${paths.join(" ")}`;

  const noConfigFallback = options.defaultConfig
    ? `linting will fall back to using the common default config.`
    : `linting will be skipped for this directory.`;

  const ignoreMessage = options.ignorePatterns
    ? `The following patterns will be ignored: ${options.ignorePatterns.join(
        ", "
      )}`
    : `Ignore patterns will be automatically detected from .gitignore files.`;

  const filePatterns = options.filePatterns || [];

  return Command.Usage({
    description: "Lint the current package",
    details: `
      This command leverages eslint to lint the current package with a set of standard defaults.

      If a configuration file is found in the current directory, it will be used. Otherwise, ${noConfigFallback}

      Files can be specified directly, or if not specified will be looked up based on the default
      file patterns: [${filePatterns.join(",")}. Lookup patterns can be overridden via the patterns option.

      ${ignoreMessage}
    `,
    examples: [
      [`Lint the current package`, `${cmdPath}}`],
      [`Lint specific files`, `${cmdPath} src/file1.ts src/file2.ts`],
      [
        `Lint files matching a custom pattern`,
        `${cmdPath} --patterns *.ts *.js *.tsx`,
      ],
    ],
  });
}

/**
 * Create a lint command that can be invoked from a CLI. Note that rather than having all of this baked into
 * a predefined class this is a factory function that can be used to create a command with the specified
 * paths and defaults. This allows for changing the paths, or creating multiple lint commands with different defaults
 *
 * @param {string[]} paths
 * @param {LintOptions} commandDefaults
 * @returns {typeof BaseCommand}
 */
export function createLintCommand(paths = ["lint"], commandDefaults = {}) {
  const baseOptions = { ...defaultLintOptions, ...commandDefaults };

  // create an anonymous command class for this command
  return class extends BaseCommand {
    /**
     * @override
     */
    static paths = [paths];

    /**
     * @override
     */
    static usage = createUsage(paths, baseOptions);

    /**
     * @type {boolean}
     */
    fix = Option.Boolean("--fix", false, {
      description: "Automatically fix problems",
    });

    /**
     * @type {boolean}
     */
    warnIgnored = Option.Boolean("--warnIgnored", false, {
      description: "Ignore warnings, only show errors",
    });

    /**
     * @type {boolean}
     */
    patterns = Option.Boolean("--patterns", false, {
      description: `Treat what comes after as file patterns to use for file matching`,
    });

    /**
     * @type {string[]}
     */
    filesOrPatterns = Option.Rest();

    /**
     * @override
     * @returns {Promise<void>}
     */
    async execute() {
      /**
       * @type {LintOptions}
       */
      const options = { ...baseOptions };

      // get the cwd and root from the context
      const cwd = this.cwd() ?? process.cwd();
      options.root = this.root();

      options.fix = this.fix;
      options.warnIgnored = this.warnIgnored;

      if (this.filesOrPatterns.length > 0) {
        if (this.patterns) {
          options.filePatterns = this.filesOrPatterns;
        } else {
          options.files = this.filesOrPatterns;
        }
      }

      await runLint(cwd, options);
    }
  };
}
