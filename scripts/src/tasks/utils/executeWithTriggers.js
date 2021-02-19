// @ts-check

const child_process = require("child_process");

/**
 * Run a command in a child process.
 * Callbacks will be called when stdout or stderr match the given RegExp.
 * @param {Object} obj
 * @param {string} obj.cmd
 * @param {{pattern: RegExp;callback: (stream: "stdout" | "stderr", data: string) => void;}[]} obj.triggers
 * @param {{ [x: string]: string; }} [obj.env]
 * @param {(string)} [obj.cwd]
 * @return {Promise<void>}
 */
module.exports = function executeWithTriggers({ cmd, triggers, env, cwd }) {
  return new Promise((resolve, reject) => {
    const child = child_process.exec(cmd, {
      env: env || process.env,
      cwd: cwd || process.cwd(),
    });
    if (!child) {
      reject();
    } else {
      child.stdout &&
        child.stdout.on("data", (chunk) => {
          process.stdout.write(chunk);
          const output = chunk.toString();

          triggers
            .filter((t) => output.match(t.pattern))
            .forEach((t) => {
              t.callback("stdout", output);
            });
        });
      child.stderr &&
        child.stderr.on("data", (chunk) => {
          process.stderr.write(chunk);
          const output = chunk.toString();

          triggers
            .filter((t) => output.match(t.pattern))
            .forEach((t) => {
              t.callback("stderr", output);
            });
        });

      child.on("exit", () => {
        if (child.exitCode !== 0) {
          reject();
        } else {
          resolve();
        }
      });
    }
  });
};
