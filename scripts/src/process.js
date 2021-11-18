// @ts-check

/**
 * @typedef {(args?: import("yargs").Arguments, rawArgs?: string[]) => Promise<void>} Command
 */

const { spawn } = require("child_process");

function discardResult() {
  return undefined;
}

/**
 *
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
 *
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
exports.sequence = sequence;
