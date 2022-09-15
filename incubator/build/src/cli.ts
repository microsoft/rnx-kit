import * as path from "node:path";
import pkgDir from "pkg-dir";
import type { Options } from "yargs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { startBuild } from "./build";
import {
  DEPLOYMENT,
  DEVICE_TYPES,
  PLATFORMS,
  USER_CONFIG_FILE,
} from "./constants";
import { getDistribution } from "./distribution";
import { getRepositoryRoot } from "./git";
import { detectPackageManager } from "./packageManager";
import { getRemoteInfo } from "./remotes";
import type { DeviceType, Platform } from "./types";

type RequiredOptionInferenceHelper<T> = Options & {
  choices: ReadonlyArray<T>;
  required: true;
};

async function main(): Promise<void> {
  const [remote, repoInfo] = getRemoteInfo();
  const setup = await remote.install();
  if (setup !== 0) {
    return;
  }

  const detectedPackageManager = await detectPackageManager();
  const projectRootOption = {
    type: "string",
    description: "Root of project",
    default: pkgDir.sync() || process.cwd(),
  } as const;

  const argv = yargs(hideBin(process.argv))
    .command("$0 [project-root]", "Build your app in the cloud", (yargs) => {
      yargs.positional("project-root", projectRootOption);
    })
    .option<"platform", RequiredOptionInferenceHelper<Platform>>("platform", {
      alias: "p",
      type: "string",
      description: "Target platform to build for",
      choices: PLATFORMS,
      required: true,
    })
    .option("architecture", {
      type: "string",
      description: "CPU architecture of the machine running the app",
      default: process.arch,
    })
    .option("deploy", {
      type: "string",
      description: "Where builds should be deployed from",
      choices: DEPLOYMENT,
      default: DEPLOYMENT[0],
    })
    .option("device-type", {
      type: "string",
      description:
        "Target device type; `emulator`/`simulator` implies `--deploy local-only`",
      choices: DEVICE_TYPES,
      default: "simulator" as DeviceType,
    })
    .option("package-manager", {
      type: "string",
      description:
        "Binary name of the package manager used in the current repo",
      default: detectedPackageManager,
      required: !detectedPackageManager,
    })
    .option("project-root", projectRootOption)
    .option("scheme", {
      type: "string",
      description: "The workspace scheme to build (iOS and macOS only)",
      default: "ReactTestApp",
    })
    .strict().argv;

  const {
    architecture,
    deploy,
    "device-type": deviceType,
    "package-manager": packageManager,
    platform,
    "project-root": projectRoot,
    scheme,
  } = argv;

  const distribution = await getDistribution(
    deviceType === "device" ? deploy : "local-only",
    projectRoot
  );

  process.exitCode = await startBuild(remote, distribution, repoInfo, {
    architecture,
    deviceType,
    distribution: await distribution.getConfigString(platform),
    packageManager: packageManager || "npm",
    platform,
    // `projectRoot` needs to be relative to repository root
    projectRoot: path.relative(
      getRepositoryRoot(),
      path.resolve(process.cwd(), projectRoot)
    ),
    scheme,
  });
}

main().catch((e) => {
  process.exitCode = 1;
  console.error(e);
  console.log("User config:", USER_CONFIG_FILE);
});
