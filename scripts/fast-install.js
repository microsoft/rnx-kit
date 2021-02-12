// @ts-check

// IMPORTANT: This module is executed before any dependencies are
// installed, so only importing built-ins are allowed.

const TRUE_VALUES = ["true", "1", "TRUE"].reduce(
  (acc, k) => ({ ...acc, [k]: true }),
  {}
);
const unpinUserConfig = !!TRUE_VALUES[process.env["YARN_UNPIN_USERCONFIG"]];

const isCi = !process.stdin.isTTY;
const extraArguments = process.argv.slice(2);

const yarnInstallTriggers = require("./utils/yarnInstallTriggers");
const executeWithTriggers = require("./utils/executeWithTriggers");

// The user config is pinned in CI environments unless explicitly disabled
const pinUserConfig = isCi && !unpinUserConfig;

// grab the midgard yarn version from scripts/package.json
const midgardYarnVersion =
  require("../package.json").devDependencies["midgard-yarn"] || "1.23.24";

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
  "midgard-yarn@" + midgardYarnVersion,
  // Force colors even though isTTY might be false.
  "--color=always",
  ...extraArguments,
]
  .filter(Boolean)
  .join(" ");

executeWithTriggers({
  cmd,
  triggers: yarnInstallTriggers,
  env,
});
