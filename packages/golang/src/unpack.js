// @ts-check

const fs = require("fs");

const { spawn } = require("./spawn");

/**
 * @typedef {{ info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void; }} Logger
 */

/**
 * Unpack a compressed archive (`.tar.gz` on Mac/Linux, `.zip` on Windows).
 *
 * @param {Logger | undefined} logger Optional logger to use when reporting progress
 * @param {string} archiveFile Path to the compressed archive file.
 * @param {string} targetDir Root directory where the archive should be unpacked.
 * @param {string} [probeDir] Optional "probe" directory to check as an indicator that the archive has already been unpacked. This is useful if the archive includes a root directory under which all files are listed.
 * @returns Task function for use with Just.
 */
function unpackTask(logger, archiveFile, targetDir, probeDir) {
  return async function unpack() {
    logger?.info(`Unpacking '${archiveFile}' to '${targetDir}'`);

    if (probeDir && fs.existsSync(probeDir)) {
      logger?.info("Already unpacked -- skipping");
      return Promise.resolve();
    }

    fs.mkdirSync(targetDir, { recursive: true });
    spawn(logger, "tar", ["-xzf", archiveFile, "-C", targetDir]);

    return Promise.resolve();
  };
}
exports.unpackTask = unpackTask;
