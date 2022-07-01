import * as path from "node:path";
import pkgDir from "pkg-dir";
import type { Options } from "yargs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { startBuild } from "./build";
import { getRepositoryRoot } from "./git";
import * as github from "./remotes/github";
import type { DeviceType, Platform, Remote, RepositoryInfo } from "./types";

type RequiredOptionInferenceHelper<T> = Options & {
  choices: T[];
  required: true;
};

function getRemoteInfo(): [Remote, RepositoryInfo] {
  const githubRepo = github.getRepositoryInfo();
  if (githubRepo) {
    return [github, githubRepo];
  }

  throw new Error("Unsupported repository");
}

async function main(): Promise<void> {
  const [remote, repoInfo] = getRemoteInfo();
  const setup = await remote.install();
  if (setup !== 0) {
    return;
  }

  const deviceTypes: DeviceType[] = ["device", "emulator", "simulator"];

  const argv = yargs(hideBin(process.argv))
    .option<"platform", RequiredOptionInferenceHelper<Platform>>("platform", {
      alias: "p",
      type: "string",
      description: "Target platform to build for",
      choices: ["android", "ios", "macos", "windows"],
      required: true,
    })
    .option("device-type", {
      type: "string",
      description: "Target device type",
      choices: deviceTypes,
      default: "simulator" as DeviceType,
    })
    .option("project-root", {
      type: "string",
      description: "Root of project",
      default: pkgDir.sync() || process.cwd(),
      coerce: (value) => {
        // `projectRoot` needs to be relative to repository root
        const repoRoot = getRepositoryRoot();
        return path.relative(repoRoot, path.resolve(process.cwd(), value));
      },
    })
    .strict().argv;

  process.exitCode = await startBuild(remote, repoInfo, {
    deviceType: argv["device-type"],
    platform: argv.platform,
    projectRoot: argv["project-root"],
  });
}

main();
