// @ts-check

import { Command } from "clipanion";

/**
 * @typedef {import("./create-context.js").ScriptContext} ScriptContext
 */

/**
 * @abstract
 * @class BaseCommand
 * @extends {Command<ScriptContext>}
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

  /**
   * @abstract
   */
  async execute() {
    throw new Error("Method not implemented.");
  }
}
