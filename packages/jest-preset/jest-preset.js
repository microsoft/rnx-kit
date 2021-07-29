/**
 * Returns the target platform.
 * @returns {string | undefined}
 */
function targetPlatform() {
  return process.env["RN_TARGET_PLATFORM"];
}

module.exports = require("./src/index")(targetPlatform());
