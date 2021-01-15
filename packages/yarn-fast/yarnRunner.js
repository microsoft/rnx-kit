// @ts-check

const child_process = require("child_process");

const yarnInstallTriggers = require("./yarnInstallTriggers");
const executeWithTriggers = require("./executeWithTriggers");

/**
 * Execute yarn
 * @param {boolean} pinUserConfig
 */
function runYarn(pinUserConfig) {
  /** @constant
   *  @type {{ [x: string]: string; }}
   */
  const env = { yarnFast: "true" };
  // The env of yarn running the command is messing with the auth
  // of the nested yarn. So we create a new unspoiled env.
  Object.keys(process.env).forEach((key) => {
    if (!key.match(/^npm_/)) {
      env[key] = process.env[key];
    }
  });

  const cmd = [
    "npx",
    // When requested, force the use of the user's .npmrc file.
    pinUserConfig ? "--userconfig .npmrc" : "",
    "midgard-yarn@1.23.22",
    // Force colors even though isTTY might be false.
    "--color=always",
  ]
    .filter(Boolean)
    .join(" ");

  return executeWithTriggers({
    cmd,
    triggers: yarnInstallTriggers,
    env,
  });
}

/**
 * Execute a lifecycle script.
 * @param {Object} obj
 * @param {string} obj.scriptName
 * @param {string[]} obj.arguments
 */
function runLifecycleScript({ scriptName, arguments = [] }) {
  child_process.execSync(`yarn ${scriptName} ${arguments.join(" ")}`, {
    stdio: "inherit",
  });
}

module.exports = { runYarn, runLifecycleScript };
