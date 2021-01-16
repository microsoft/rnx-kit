// @ts-check

const { redMessage } = require("./consoleFormatter");

function epermCallback() {
  redMessage([
    `You have hit an EPERM error, the FxDx team is looking for repros of this problem.`,
    `Please try the following steps:`,
    `   1 - make sure no instance of "yarn watch" is running`,
    `   2 - run "yarn fast" again`,
    `   3 - if it still fails, close VSCode and run "yarn fast" from your favorite terminal`,
    `   4 - if it still fails, please contact Vincent Bailly (vibailly@microsoft.com) to help investigate the issue.`,
    `   5 - if Vincent is not available, run "yarn clean" and try again "yarn fast"`,
  ]);

  process.exit(1);
}

function authCallback() {
  redMessage([
    `You have hit an auth issue, please refer to this wiki:`,
    `https://dev.azure.com/office/Office/_wiki/wikis/1JS/23437/Getting-Started?anchor=setting-up-for-package-feed-authentication`,
  ]);

  process.exit(1);
}

// Because callbacks may decide to terminate the entire process,
// the order of the triggers could have an impact in the behavior.
module.exports = [
  { pattern: /EPERM/, callback: epermCallback },
  { pattern: /401 Unauthorized/, callback: authCallback },
];
