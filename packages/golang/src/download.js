// @ts-check

const fs = require("fs");
const got = require("got");
const hasha = require("hasha");
const path = require("path");
const stream = require("stream");
const { promisify } = require("util");

/**
 * @typedef {{ info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void; }} Logger
 */

/**
 * Download a file from an http(s) URL using a GET request. Verify the file
 * contents using a hash.
 *
 * @param {Logger | undefined} logger Optional logger to use when reporting progress
 * @param {string} url Url of the file to download. Can be http or https.
 * @param {string} targetFile File name and path to use for the downloaded file. Existing files are overwritten. Relative paths are resolved using the current working directory.
 * @param {"sha256" | "sha512" | "md5" | "sha1" | string} hashAlgorithm Name of the hash algorithm to use. See https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options.
 * @param {string} expectedHash Expected hash value for the file. Hex-encoded, lower-case.
 * @returns Task function to be used with Just.
 */
function downloadTask(logger, url, targetFile, hashAlgorithm, expectedHash) {
  async function validateHash() {
    logger?.info(`Verifying ${hashAlgorithm} hash of file '${targetFile}'`);
    const calculatedHash = await hasha.fromFile(targetFile, {
      encoding: "hex",
      algorithm: hashAlgorithm,
    });

    if (calculatedHash === expectedHash) {
      logger?.info("File is valid (hash matches)");
    } else {
      logger?.warn(
        `File is invalid -- hash mismatch:\n  calculated: ${calculatedHash}\n    expected: ${expectedHash}'\n   algorithm: ${hashAlgorithm}`
      );
    }

    return Promise.resolve(calculatedHash === expectedHash);
  }

  return async function download() {
    const pipeline = promisify(stream.pipeline);
    const targetPath = path.resolve(targetFile);

    logger?.info(`Downloading '${url}' to '${targetPath}'`);

    if (fs.existsSync(targetPath)) {
      logger?.info(`Found target file '${targetPath}'`);
      if (await validateHash()) {
        return Promise.resolve();
      }
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    const options = {
      resolveBodyOnly: false,
      decompress: false,
      throwHttpErrors: true,
      timeout: 60 * 1000,
      https: {
        rejectUnauthorized: true,
      },
    };
    await pipeline(
      got.default.stream.get(url, options),
      fs.createWriteStream(targetPath, { flags: "w" })
    );

    if (!(await validateHash())) {
      throw new Error(`Download from '${url}' failed with a hash mismatch`);
    }

    return Promise.resolve();
  };
}
exports.downloadTask = downloadTask;
