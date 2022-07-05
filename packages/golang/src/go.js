// @ts-check

const findUp = require("find-up");
const fs = require("fs");
const path = require("path");

const { downloadTask } = require("./download");
const { unpackTask } = require("./unpack");
const { spawn } = require("./spawn");

/**
 * @typedef {{url: string, hashAlgorithm: string, hash: string }} GoDistribution
 * @typedef {{ info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void; }} Logger
 */

const WORKSPACE_ROOT_SENTINELS = [
  "lerna.json",
  "rush.json",
  "yarn.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
];

/**
 * Returns the architecture that we should fetch Go binaries for.
 * @returns {string}
 */
function getCurrentArchitecture() {
  switch (process.arch) {
    case "x32":
      return "386";
    case "x64":
      return "amd64";
    default:
      return process.arch;
  }
}

/**
 * Get info on the Go distrubution matching the current plaform/architecture.
 *
 * @returns {GoDistribution | undefined} Go distribution info, or `undefined` if a distribution isn't available.
 */
function getGoDistribution() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), {
      encoding: "utf-8",
    })
  );
  const { version, hashAlgorithm, checksums } = manifest["go-release"];
  const p = checksums[process.platform];
  if (!p) {
    return undefined;
  }

  const hash = p[process.arch];
  if (!hash) {
    return undefined;
  }

  const platform = process.platform === "win32" ? "windows" : process.platform;
  const extension = process.platform === "win32" ? "zip" : "tar.gz";
  return {
    url: `https://golang.org/dl/go${version}.${platform}-${getCurrentArchitecture()}.${extension}`,
    hash,
    hashAlgorithm,
  };
}

/**
 * Get the path of the monorepo's root node_modules/.cache directory.
 *
 * @returns {string} Path to the root node_modules/.cache directory
 */
function getWorkspaceCacheDir() {
  const sentinel = findUp.sync(WORKSPACE_ROOT_SENTINELS);
  if (!sentinel) {
    throw new Error("Cannot find the root of the repository");
  }

  const workspaceRoot = path.dirname(sentinel);
  return path.join(workspaceRoot, "node_modules", ".cache");
}

/**
 * Get the path to the Go executable.
 *
 * This looks for a local installation of Go first. If not found, it assumes
 * Go is available through the system PATH.
 */
function getGoExecutable() {
  const goExecutableFileName = process.platform === "win32" ? "go.exe" : "go";
  const goLocalExecutable = path.join(
    getWorkspaceCacheDir(),
    // The "go" subdirectory comes from unpacking the Go archive. It is part
    // of the Go distribution.
    "go",
    "bin",
    goExecutableFileName
  );
  if (fs.existsSync(goLocalExecutable)) {
    return goLocalExecutable;
  }
  return "go";
}

/**
 * Ensure that Go is installed and available for building Go projects via
 * `goBuildTask()`.
 *
 * @param {Logger | undefined} logger Optional logger to use when reporting progress
 */
function goInstallTask(logger) {
  return async function goInstall() {
    try {
      spawn(undefined, "go", ["version"]).trim();
      logger?.info("Found Go in the system PATH");
      return Promise.resolve();
    } catch (_) {
      // nop
    }

    const unpackDir = getWorkspaceCacheDir();
    // The "go" subdirectory comes from unpacking the archive. It is part of
    // the Go distribution.
    const probeDir = path.join(unpackDir, "go");
    if (fs.existsSync(probeDir)) {
      logger?.info(`Found Go: ${probeDir}`);
      return Promise.resolve();
    }

    logger?.info("Go is not installed on this machine");

    const goDistribution = getGoDistribution();
    if (!goDistribution) {
      logger?.error(
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
      logger,
      goDistribution.url,
      downloadFile,
      goDistribution.hashAlgorithm,
      goDistribution.hash
    )();

    await unpackTask(logger, downloadFile, unpackDir, probeDir)();

    logger?.info(`Installed Go: ${probeDir}`);
    return Promise.resolve();
  };
}
exports.goInstallTask = goInstallTask;

/**
 * Build all Go projects in the current package.
 *
 * Go projects are expected to be under <packageRoot>/go/<projectName>.
 *
 * Built binaries are stored under <packageRoot>/bin.
 *
 * @param {Logger | undefined} logger Optional logger to use when reporting progress
 * @returns Task function for use with Just.
 */
function goBuildTask(logger) {
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
        logger?.info(`Building Go project '${projectDir}'`);

        const cwd = path.join(goSourceRoot, projectDir);
        spawn(logger, goExecutable, ["build", "-o", binPath], cwd);
      }

      return Promise.resolve();
    };
  }

  return async function skipBuildGo() {
    logger?.info("No projects found -- skipping");
  };
}
exports.goBuildTask = goBuildTask;

/**
 * Execute a Go program with optional arguments.
 *
 * @param {Logger | undefined} logger Optional logger to use when reporting progress
 * @param {string} name Path to the Go program file. Relative paths are resolved to the current package's "bin" directory.
 * @param {string[]} args Optional program arguments.
 * @returns Task function for use with Just.
 */
function goTask(logger, name, ...args) {
  return async function go() {
    const executable = path.resolve(path.join(process.cwd(), "bin"), name);
    spawn(logger, executable, args);
    return Promise.resolve();
  };
}
exports.goTask = goTask;
