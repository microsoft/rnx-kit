import { Cli, type CliOptions } from "clipanion";
import type { ScriptContext } from "./types.ts";

/**
 * @class RnxCli
 * @extends {Cli<ScriptContext>}
 * @description
 * This class is a wrapper around the Clipanion CLI class.
 * It provides a way to create a CLI with such that the default context will contain additional information that
 * registered commands can rely on.
 */
export class RnxCli extends Cli<ScriptContext> {
  private scriptDefaults: Pick<ScriptContext, "cwd" | "root">;

  /**
   * @param root root directory of the project
   * @param options standard clipanion cli options
   */
  constructor(root: string, options: Partial<CliOptions> = {}) {
    super(options);
    this.scriptDefaults = { root, cwd: process.cwd() };
    RnxCli.defaultContext = { ...Cli.defaultContext, ...this.scriptDefaults };
  }

  /**
   * @param overrides optional override values for the context
   * @returns a script context object to use for run commands
   */
  context(overrides: Partial<ScriptContext> = {}): ScriptContext {
    return { ...RnxCli.defaultContext, ...this.scriptDefaults, ...overrides };
  }
}
