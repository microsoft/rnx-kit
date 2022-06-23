import * as path from "path";
import pkgDir from "pkg-dir";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { startBuild } from "./build";
import { getRepositoryRoot } from "./git";
import * as github from "./remotes/github";
import type { Platform, Remote, RepositoryInfo } from "./types";

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

  const argv = yargs(hideBin(process.argv))
    .option("platform", {
      alias: "p",
      type: "string",
      description:
        "Supported platforms are `android`, `ios`, `macos`, `windows`",
      choices: ["android", "ios", "macos", "windows"] as const,
      required: true,
    })
    .option("device-type", {
      type: "string",
      description:
        "Supported device types are `device`, `emulator`, `simulator`",
      choices: ["device", "emulator", "simulator"] as const,
      default: "simulator" as const,
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
    }).argv;

  process.exitCode = await startBuild(remote, repoInfo, {
    deviceType: argv["device-type"],
    platform: argv.platform as Platform,
    projectRoot: argv["project-root"],
  });
}

main();
