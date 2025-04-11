import { includeIgnoreFile } from "@eslint/compat";
import { BaseCommand } from "@yarnpkg/cli";
import { Configuration, Project } from "@yarnpkg/core";
import { Option } from "clipanion";
import type { Linter } from "eslint";
import { ESLint } from "eslint";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

type LinterConfigs = Linter.Config<Linter.RulesRecord>[];

export class Lint extends BaseCommand {
  static override paths = [["rnx-lint"]];

  fix = Option.Boolean("--fix", false, {
    description: "Automatically fix problems",
  });

  patterns = Option.Rest({ name: "file.js" });

  async execute(): Promise<number | void> {
    const cwd = this.context.cwd;
    const configuration = await Configuration.find(cwd, this.context.plugins);
    const { project } = await Project.find(configuration, cwd);

    const [overrideConfigFile, overrideConfig] = await this.loadConfig(cwd);

    const eslint = new ESLint({
      cwd,
      ignorePatterns: this.ignorePatterns(project),
      warnIgnored: false,
      overrideConfigFile,
      overrideConfig,
      fix: this.fix,
    });

    const results = await eslint.lintFiles(this.filePatterns());
    await ESLint.outputFixes(results);

    const formatter = await this.loadFormatter();
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

  private filePatterns() {
    if (this.patterns.length > 0) {
      return this.patterns;
    }

    const args = [
      "ls-files",
      "*.cjs",
      "*.js",
      "*.jsx",
      "*.mjs",
      "*.ts",
      "*.tsx",
    ];
    const { stdout } = spawnSync("git", args);
    return stdout.toString().trim().split("\n");
  }

  private ignorePatterns(project: Project): string[] {
    const patterns: string[] = [];

    const locations = [project.cwd, this.context.cwd];
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

  private async loadConfig(
    cwd: string
  ): Promise<[boolean | string, LinterConfigs | undefined]> {
    const eslintConfigPath = path.join(cwd, "eslint.config.js");
    const overrideConfigFile = fs.existsSync(eslintConfigPath)
      ? eslintConfigPath
      : true;

    if (overrideConfigFile !== true) {
      return [eslintConfigPath, undefined];
    }

    const rnx = await import("@rnx-kit/eslint-plugin");
    const config = [
      ...rnx.configs.strict,
      ...rnx.configs.stylistic,
      {
        rules: {
          "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        },
      },
    ];

    return [true, config];
  }

  /**
   * ESLint will try to dynamically import a formatter and fail. We bundle our
   * own formatter to bypass this.
   */
  private async loadFormatter() {
    const { default: format } = await import("eslint-formatter-pretty");
    return { format };
  }
}

// eslint-disable-next-line no-restricted-exports
export default {
  name: "@rnx-kit/yarn-plugin-eslint",
  commands: [Lint],
};
