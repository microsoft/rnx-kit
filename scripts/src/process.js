// @ts-check

/**
 * @typedef {(args?: import("yargs").Arguments, rawArgs?: string[]) => Promise<void>} Command
 * @typedef {import("node:child_process").SpawnOptions} SpawnOptions
 */

import * as child_process from "node:child_process";
import * as os from "node:os";
import { URL, fileURLToPath } from "node:url";

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {boolean}
 */
function isRunningNx(command, args) {
  return command.startsWith("yarn") && args[0] === "nx";
}

function workspaceRoot() {
  return fileURLToPath(new URL("../../", import.meta.url));
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {SpawnOptions=} options
 * @returns {Promise<void>}
 */
function spawn(command, args, options) {
  return new Promise((resolve, reject) => {
    /** @type {SpawnOptions} */
    const opts = {
      ...options,
      stdio: "inherit",
      // As of Node 20.12.2, it is no longer allowed to spawn a process with
      // `.bat` or `.cmd` without shell (see
      // https://nodejs.org/en/blog/release/v20.12.2).
      shell: command.endsWith(".bat") || command.endsWith(".cmd"),
    };
    child_process.spawn(command, args, opts).on("close", (code) => {
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
export function execute(command, ...args) {
  return spawn(command, args, {
    // Nx is only installed at workspace root — adjust `cwd` accordingly.
    cwd: isRunningNx(command, args) ? workspaceRoot() : process.cwd(),
  });
}

/**
 * @param {string} command
 * @param {...string} args
 * @returns {Promise<void>}
 */
export function runScript(command, ...args) {
  const yarn = os.platform() === "win32" ? "yarn.cmd" : "yarn";
  return execute(yarn, command, ...args);
}
