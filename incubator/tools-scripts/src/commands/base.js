import { Command } from "clipanion";

/**
 * @typedef {import("clipanion").Command} Command
 * @typedef {import("clipanion").Cli} Cli
 * @typedef {import("../types").ProjectInfoProvider} ProjectInfoProvider
 * @typedef {import("../types").ScriptContext} ScriptContext
 * @typedef {Command<ScriptContext>} BaseCommand
 */

export class BaseCommand extends Command {
  /**
   * @returns {string}
   */
  cwd() {
    return this.context.cwd;
  }

  /**
   * @returns {string}
   */
  root() {
    return this.context.root;
  }
}

/**
 * @param {Cli} cli
 * @param {string} root
 */
export function createContext(cli, root) {
  const cwd = process.cwd();
  return { ...cli.defaultContext, cwd, root };
}
