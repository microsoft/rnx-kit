/** @typedef {import("@jest/types").Config.InitialOptions} InitialOptions */

/**
 * Returns the target platform.
 * @returns {string | undefined}
 */
function targetPlatform() {
  return process.env["RN_TARGET_PLATFORM"];
}

/** @type {(defaultPlatform?: string, userOptions?: InitialOptions) => InitialOptions} */
module.exports = require("./src/index")(targetPlatform());
