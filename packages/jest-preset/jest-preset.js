/**
 * Returns the target platform.
 * @returns {string | undefined}
 */
function targetPlatform() {
  return process.env["RN_TARGET_PLATFORM"];
}

/** @type {import("@jest/types").Config.InitialOptions} */
module.exports = require("./src/index")(targetPlatform());
