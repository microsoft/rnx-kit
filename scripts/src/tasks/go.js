// @ts-check

const fs = require("fs");
const { logger } = require("just-scripts");
const path = require("path");
const { getWorkspaceRoot } = require("workspace-tools");

const { downloadTask } = require("./download");
const { unpackTask } = require("./unpack");
const { spawn } = require("./utils/spawn");

/**
 * @typedef {{url: string, hashAlgorithm: string, hash: string }} GoDistribution
 */

/**
 * Listing of known Go binary distributions, indexed by NodeJs process.platform
 * then further indexed by process.arch.
 *
 * @type {{[platform: string]: {[architecture: string]: GoDistribution }}}
 */
const goDistributions = {
  darwin: {
    arm64: {
      url: "https://golang.org/dl/go1.17.2.darwin-arm64.tar.gz",
      hashAlgorithm: "sha256",
      hash: "ce8771bd3edfb5b28104084b56bbb532eeb47fbb7769c3e664c6223712c30904",
    },
    x64: {
      url: "https://golang.org/dl/go1.17.2.darwin-amd64.tar.gz",
      hashAlgorithm: "sha256",
      hash: "7914497a302a132a465d33f5ee044ce05568bacdb390ab805cb75a3435a23f94",
    },
  },
  linux: {
    x32: {
      url: "https://golang.org/dl/go1.17.2.linux-386.tar.gz",
      hashAlgorithm: "sha256",
      hash: "8617f2e40d51076983502894181ae639d1d8101bfbc4d7463a2b442f239f5596",
    },
    x64: {
      url: "https://golang.org/dl/go1.17.2.linux-amd64.tar.gz",
      hashAlgorithm: "sha256",
      hash: "f242a9db6a0ad1846de7b6d94d507915d14062660616a61ef7c808a76e4f1676",
    },
    arm64: {
      url: "https://golang.org/dl/go1.17.2.linux-arm64.tar.gz",
      hashAlgorithm: "sha256",
      hash: "a5a43c9cdabdb9f371d56951b14290eba8ce2f9b0db48fb5fc657943984fd4fc",
    },
  },
  windows: {
    x32: {
      url: "https://golang.org/dl/go1.17.2.windows-386.zip",
      hashAlgorithm: "sha256",
      hash: "8a85257a351996fdf045fe95ed5fdd6917dd48636d562dd11dedf193005a53e0",
    },
    x64: {
      url: "https://golang.org/dl/go1.17.2.windows-amd64.zip",
      hashAlgorithm: "sha256",
      hash: "fa6da0b829a66f5fab7e4e312fd6aa1b2d8f045c7ecee83b3d00f6fe5306759a",
    },
  },
};

/**
 * Get info on the Go distrubution matching the current plaform/architecture.
 *
 * @returns {GoDistribution | undefined} Go distribution info, or `undefined` if a distribution isn't available.
 */
function getGoDistribution() {
  const p = goDistributions[process.platform];
  if (p) {
    return p[process.arch];
  }
  return undefined;
}

/**
 * Get the path of the monorepo's root node_modules/.cache directory.
 *
 * @returns {string} Path to the root node_modules/.cache directory
 */
function getWorkspaceCacheDir() {
  const workspaceRoot = getWorkspaceRoot(process.cwd());
  if (!workspaceRoot) {
    throw new Error("Cannot find the root of the repository");
  }

  return path.join(workspaceRoot, "node_modules", ".cache");
}

/**
 * Get the path to the Go executable.
 *
 * This looks for a local installation of Go first. If not found, it assumes
 * Go is available through the system PATH.
 */
function getGoExecutable() {
  const goLocalExecutable = path.join(
    getWorkspaceCacheDir(),
    // The "go" subdirectory comes from unpacking the Go archive. It is part
    // of the Go distribution.
    "go",
    "bin",
    "go"
  );
  if (fs.existsSync(goLocalExecutable)) {
    return goLocalExecutable;
  }
  return "go";
}

/**
 * Ensure that Go is installed and available for building Go projects via
 * `goBuildTask()`.
 */
function goInstallTask() {
  return async function goInstall() {
    logger.info("Looking for an installation of Go");

    try {
      spawn("go", ["version"]).trim();
      logger.info("Found Go in the system PATH");
      return Promise.resolve();
    } catch (_) {
      // nop
    }
    logger.info("Go is not installed on this machine");

    const goDistribution = getGoDistribution();
    if (!goDistribution) {
      logger.error(
        `This build system requires Go, but there isn't currently a distribution for your build machine architecture '${process.platform}-${process.arch}'. Common architectures like 64-bit linux, windows, and mac are all supported. If you can't use those types of systems and require support for '${process.platform}-${process.arch}', please open an issue: https://github.com/microsoft/rnx-kit/issues.`
      );
      throw new Error(
        `Unsupported build machine architecture '${process.platform}-${process.arch}'`
      );
    }

    const downloadDir = path.join(process.cwd(), "node_modules", ".cache");
    const downloadFile = path.join(
      downloadDir,
      path.basename(goDistribution.url)
    );
    await downloadTask(
      goDistribution.url,
      downloadFile,
      goDistribution.hashAlgorithm,
      goDistribution.hash
    )();

    const unpackDir = getWorkspaceCacheDir();
    // The "go" subdirectory comes from unpacking the archive. It is part of
    // the Go distribution.
    const probeDir = path.join(unpackDir, "go");
    await unpackTask(downloadFile, unpackDir, probeDir)();

    logger.info(`Installed Go: ${probeDir}`);
    return Promise.resolve();
  };
}
module.exports.goInstallTask = goInstallTask;

/**
 * Build all Go projects in the current package.
 *
 * Go projects are expected to be under <packageRoot>/go/<projectName>.
 *
 * Built binaries are stored under <packageRoot>/bin.
 *
 * @returns Task function for use with Just.
 */
function goBuildTask() {
  const goSourceRoot = path.join(process.cwd(), "go");
  const binPath = path.join(process.cwd(), "bin");

  /** @type string[] */
  let projectDirs = [];
  if (fs.existsSync(goSourceRoot)) {
    projectDirs = fs
      .readdirSync(goSourceRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }

  if (projectDirs.length > 0) {
    return async function buildGo() {
      const goExecutable = getGoExecutable();

      fs.mkdirSync(binPath, { recursive: true });

      for (const projectDir of projectDirs) {
        logger.info(`Building Go project '${projectDir}'`);

        const cwd = path.join(goSourceRoot, projectDir);
        spawn(goExecutable, ["build", "-o", binPath], cwd);
      }

      return Promise.resolve();
    };
  }

  return async function skipBuildGo() {
    logger.info("No projects found -- skipping");
  };
}
module.exports.goBuildTask = goBuildTask;

/**
 * Execute a Go program with optional arguments.
 *
 * @param {string} name Path to the Go program file. Relative paths are resolved to the current package's "bin" directory.
 * @param {string[]} args Optional program arguments.
 * @returns Task function for use with Just.
 */
function goTask(name, ...args) {
  return async function go() {
    const executable = path.resolve(path.join(process.cwd(), "bin"), name);
    spawn(executable, args);
    return Promise.resolve();
  };
}
module.exports.goTask = goTask;
