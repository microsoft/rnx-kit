const child_process = require("child_process");

/**
 * @typedef {{ info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void; }} Logger
 */

/**
 * Spawn a child process, and wait for it to complete. Print stdout and stderr
 * to the build log. On success, returns stdout. On failure, throw an Error
 * explaining the problem.
 *
 * @param {Logger | undefined} logger Optional logger to use when reporting progress
 * @param {string} command Name of the executable to run.
 * @param {string[]} [args] Optional command-line arguments.
 * @param {string} [cwd] Optional working directory for the child process. When not given, the current working directory is used.
 * @returns Contents of stdout.
 */
function spawn(logger, command, args, cwd) {
  logger?.info(`Executing: ${command} ${args ? args.join(" ") : ""}`);
  const cp = child_process.spawnSync(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    ...(cwd ? { cwd } : undefined),
  });

  const stdout = cp.stdout ? cp.stdout.toString("utf8") : "";
  const stderr = cp.stderr ? cp.stderr.toString("utf8") : "";
  if (stdout) {
    logger?.info("STDOUT:");
    stdout.split("\n").forEach((l) => logger?.info(l));
  }
  if (stderr) {
    logger?.error("STDERR:");
    stderr.split("\n").forEach((l) => logger?.error(l));
  }

  if (cp.error) {
    throw cp.error;
  } else if (cp.signal) {
    throw new Error(`Failed with signal ${cp.signal}'`);
  } else if (cp.status !== 0) {
    throw new Error(`Failed with exit code ${cp.status}'`);
  }

  return stdout;
}
exports.spawn = spawn;
