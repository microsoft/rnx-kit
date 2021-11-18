// @ts-check

/** @type {import("../process").Command} */
module.exports = async (_args, _rawArgs) => {
  const { goBuildTask, goInstallTask } = require("@rnx-kit/golang");
  await goInstallTask(console)();
  await goBuildTask(console)();
};
