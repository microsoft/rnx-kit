// @ts-check

import { Cli } from "clipanion";

/**
 * @typedef {import("clipanion").BaseContext} BaseContext
 *
 * @typedef ScriptContextProps
 * @type {object}
 * @property {string} cwd - current working directory for the command
 * @property {string} root - root path of the repository
 *
 * @typedef {BaseContext & ScriptContextProps} ScriptContext
 */

/**
 * @param {string} root
 * @returns {ScriptContext}
 */
export function createContext(root) {
  const cwd = process.cwd();
  return { ...Cli.defaultContext, cwd, root };
}
