// @ts-check

import { Command, Option, type CommandClass } from "clipanion";
import { BaseCommand } from "./commands.ts";
import {
  defaultLintConfig,
  runLint,
  type LintConfiguration,
  type LintOptions,
} from "./lint.ts";
import { type ScriptContext } from "./types.ts";

/**
 * @param {string[]} paths
 * @param {Partial<LintOptions>} options
 * @returns {Usage}
 */
function createUsage(paths: string[][], options: Partial<LintConfiguration>) {
  const cmdPaths = paths.map((path) => `$0 ${path.join(" ")}`);
  const cmdPath = cmdPaths.length > 1 ? `[${cmdPaths.join("|")}]` : cmdPaths[0];

  const noConfigFallback = options.fallbackConfig
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
export function createLintCommand(
  paths: string[][] = [["lint"]],
  commandDefaults: Partial<LintOptions> = {}
): CommandClass<ScriptContext> {
  const baseConfig = { ...defaultLintConfig, ...commandDefaults };

  // create an anonymous command class for this command
  return class extends BaseCommand {
    static override paths = paths;
    static override usage = createUsage(paths, baseConfig);

    /**
     * Fix the found issues where possible
     */
    fix = Option.Boolean("--fix", false, {
      description: "Automatically fix problems",
    });

    /**
     * Ignore warnings
     */
    warnIgnored = Option.Boolean("--warnIgnored", false, {
      description: "Ignore warnings, only show errors",
    });

    /**
     * Treat the trailing arguments as file patterns instead of files
     */
    patterns = Option.Boolean("--patterns", false, {
      description: `Treat what comes after as file patterns to use for file matching`,
    });

    /**
     * either a list of files to lint, or a list of patterns to use for file matching
     */
    filesOrPatterns = Option.Rest();

    /**
     * @returns {Promise<1 | void>}
     */
    async execute() {
      const options: LintOptions = {
        ...baseConfig,
        cwd: this.context.cwd ?? process.cwd(),
        fix: this.fix ?? baseConfig.fix,
        warnIgnored: this.warnIgnored ?? baseConfig.warnIgnored,
      };

      if (this.filesOrPatterns.length > 0) {
        if (this.patterns) {
          options.filePatterns = this.filesOrPatterns;
        } else {
          options.files = this.filesOrPatterns;
        }
      }

      return await runLint(options);
    }
  };
}
