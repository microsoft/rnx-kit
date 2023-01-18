// @ts-check

/**
 * @typedef {(args?: import("yargs").Arguments, rawArgs?: string[]) => Promise<void>} Command
 */

import { spawn } from "node:child_process";
import * as os from "node:os";

/**
 * @param {string} command
 * @param {...string} args
 * @returns {Promise<void>}
 */
export function execute(command, ...args) {
  return new Promise((resolve, reject) => {
    spawn(command, args, { stdio: "inherit" }).on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

/**
 * @param {string} command
 * @param {...string} args
 * @returns {Promise<void>}
 */
export function runScript(command, ...args) {
  const yarn = os.platform() === "win32" ? "yarn.cmd" : "yarn";
  return execute(yarn, "--silent", command, ...args);
}

/**
 * @param {...() => Promise<void>} scripts
 * @returns {Promise<void>}
 */
export function sequence(...scripts) {
  return scripts.reduce(
    (result, script) => result.then(() => script()),
    Promise.resolve()
  );
}
