const path = require("path");
const { spawnSync } = require("child_process");
const npmPath = process.env.npm_execpath;

const Strings = {
  useYarnInstead: `Looks like you are trying to run "npm install". This repository uses Yarn as its package manager.
`,
  yarnDetected: `Great! Looks like you already have yarn installed!
`,
  installYarn: `You currently do not have an installation of Yarn in your PATH. Please install the latest stable version of Yarn following the instructions at https://yarnpkg.com/en/docs/install or by running "npm install -g yarn".
`,
  gettingStartedWithYarn: `To install dependencies and establish links between projects, simply run:

  yarn

You can then build the packages:

  yarn build
`,
};

if (path.basename(npmPath) !== "yarn.js") {
  console.error(Strings.useYarnInstead);

  if (!detectYarnInstallation()) {
    console.log(Strings.installYarn);
  } else {
    console.log(Strings.yarnDetected);
  }

  console.log(Strings.gettingStartedWithYarn);

  process.exit(1);
}

checkRepositoryLocation();

function checkRepositoryLocation() {
  if (process.platform !== "win32") {
    return;
  }

  const nodePath = path.parse(process.execPath);
  const repositoryPath = path.parse(__dirname);

  if (nodePath.root !== repositoryPath.root) {
    console.warn(
      "\x1b[33m%s\x1b[0m",
      "Your repository is located on a different drive than node.exe. This may cause build failure when running Jest tests."
    );
  }
}

function detectYarnInstallation() {
  const yarnResult = spawnSync("yarn", ["--version"]);
  return yarnResult.status === 0;
}
