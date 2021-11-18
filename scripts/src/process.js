// @ts-check

/**
 * @typedef {(args?: import("yargs").Arguments, rawArgs?: string[]) => Promise<void>} Command
 */

const { spawn } = require("child_process");
const os = require("os");

function discardResult() {
  return undefined;
}

/**
 * @param {string} command
 * @param {...string} args
 * @returns {Promise<void>}
 */
function execute(command, ...args) {
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
function runScript(command, ...args) {
  const yarn = os.platform() === "win32" ? "yarn.cmd" : "yarn";
  return execute(yarn, "--silent", command, ...args);
}

/**
 * @param {...() => Promise<void>} scripts
 * @returns {Promise<void>}
 */
function sequence(...scripts) {
  return scripts.reduce(
    (result, script) => result.then(() => script()),
    Promise.resolve()
  );
}

exports.discardResult = discardResult;
exports.execute = execute;
exports.runScript = runScript;
exports.sequence = sequence;
