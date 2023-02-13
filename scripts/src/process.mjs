// @ts-check

/**
 * @typedef {(args?: import("yargs").Arguments, rawArgs?: string[]) => Promise<void>} Command
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";

function findWorkspaceRoot() {
  // @ts-expect-error ts(1343): 'import.meta' is only allowed when module is ESM
  const require = createRequire(import.meta.url);
  const scriptsDir = path.dirname(
    require.resolve("@rnx-kit/scripts/package.json")
  );
  return path.dirname(scriptsDir);
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
      cwd:
        command.startsWith("yarn") && args[0] === "nx"
          ? findWorkspaceRoot()
          : process.cwd(),
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
