// @ts-check

// IMPORTANT: This module is executed before any dependencies are
// installed, so only importing built-ins are allowed.

const TRUE_VALUES = ["true", "1", "TRUE"].reduce(
  (acc, k) => ({ ...acc, [k]: true }),
  {}
);

const fs = require("fs");
const { runYarn, runLifecycleScript } = require("./yarnRunner");

const isCi = !process.stdin.isTTY;
const unpinUserConfig = !!TRUE_VALUES[process.env["YARN_UNPIN_USERCONFIG"]];
const extraArguments = process.argv.slice(2);

// The user config is pinned in CI environments unless explicitly disabled
const useSpecificNpmrc = isCi && !unpinUserConfig;

// Reset scopes
if (fs.existsSync("scopedInstallPackage.json")) {
  fs.unlinkSync("scopedInstallPackage.json");
}

// Step 1: we run local-only preinstall script
if (!isCi) {
  runLifecycleScript({
    scriptName: "preinstall-local",
    arguments: extraArguments,
  });
}

// Step 2: run yarn.
runYarn(useSpecificNpmrc)
  .catch(() => process.exit(1))
  .then(() => {
    // Step 3: we run local-only postinstall script
    if (!isCi) {
      runLifecycleScript({
        scriptName: "postinstall-local",
        arguments: extraArguments,
      });
    }
  });
