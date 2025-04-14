import { defaultLintOptions, lint } from "../scripts/lint.js";

/**
 * @typedef {import("../scripts/lint").LintOptions} LintOptions
 * @typedef {import("clipanion").Command} Command
 */

/**
 * @param {string[]} paths
 * @param {LintOptions} options
 * @returns {Command.Usage}
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

  return Command.Usage({
    description: "Lint the current package",
    details: `
      This command leverages eslint to lint the current package with a set of standard defaults.

      If a configuration file is found in the current directory, it will be used. Otherwise, ${noConfigFallback}

      Files can be specified directly, or if not specified will be looked up based on the default
      file patterns: [${options.filePatterns.join(",")}. Lookup patterns can be overridden via the patterns option.

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
 * @param {Partial<LintOptions>} commandDefaults
 * @returns {class extends BaseCommand}
 */
export function createLintCommand(paths = ["lint"], commandDefaults = {}) {
  // create an anonymous command class for this command
  return class extends BaseCommand {
    /**
     * @override
     */
    static paths = [paths];

    /**
     * @override
     */
    static usage = createUsage(paths, options);

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
     * @returns {Promise<number>}
     */
    async execute() {
      const options = { ...defaultLintOptions, ...commandDefaults };

      // get the cwd and root from the context
      options.cwd = this.cwd() ?? process.cwd();
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

      return await lint(options);
    }
  };
}
