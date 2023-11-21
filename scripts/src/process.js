// @ts-check

/**
 * @typedef {(args?: import("yargs").Arguments, rawArgs?: string[]) => Promise<void>} Command
 */

import { spawn } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { require } from "./require.js";

function findWorkspaceRoot(options = { paths: [process.cwd()] }) {
  const scriptsDir = path.dirname(
    require.resolve("@rnx-kit/scripts/package.json", options)
  );
  return path.dirname(scriptsDir);
}

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {boolean}
 */
function isRunningNx(command, args) {
  return command.startsWith("yarn") && args[0] === "nx";
}

/**
 * @param {string} command
 * @param {...string} args
 * @returns {Promise<void>}
 */
export function execute(command, ...args) {
  return new Promise((resolve, reject) => {
    /** @type {import("node:child_process").SpawnOptions} */
    const options = {
      // Nx is only installed at workspace root — adjust `cwd` accordingly.
      cwd: isRunningNx(command, args) ? findWorkspaceRoot() : process.cwd(),
      stdio: "inherit",
    };
    spawn(command, args, options).on("close", (code) => {
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
  return execute(yarn, command, ...args);
}

/**
 * @param {...(() => Promise<void>)} scripts
 * @returns {Promise<void>}
 */
export function sequence(...scripts) {
  return scripts.reduce(
    (result, script) => result.then(() => script()),
    Promise.resolve()
  );
}
