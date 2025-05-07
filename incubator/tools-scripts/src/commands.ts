// @ts-check

import { Command } from "clipanion";
import { type ScriptContext } from "./types.ts";

/**
 * @abstract
 * @class BaseCommand
 * @extends {Command<ScriptContext>}
 */
export abstract class BaseCommand extends Command<ScriptContext> {
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
