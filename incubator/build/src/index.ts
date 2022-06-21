import * as path from "path";
import pkgDir from "pkg-dir";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { startBuild } from "./build";
import { getRepositoryRoot } from "./git";
import * as github from "./remotes/github";
import type { BuildParams, Platform } from "./types";

export function build(params: BuildParams): Promise<number> {
  const githubRepo = github.getRepositoryInfo();
  if (githubRepo) {
    return startBuild(github, githubRepo, params);
  }

  return Promise.reject("Unsupported repository");
}

function main(): void {
  const repoRoot = getRepositoryRoot();
  const params = yargs(hideBin(process.argv))
    .option("platform", {
      alias: "p",
      type: "string",
      description:
        "Supported platforms are `android`, `ios`, `macos`, `windows`",
      choices: ["android", "ios", "macos", "windows"],
      required: true,
    })
    .option("project-root", {
      type: "string",
      description: "Root of project",
      default: path.relative(repoRoot, pkgDir.sync() || process.cwd()),
      coerce: (value) => {
        // `projectRoot` needs to be relative to repository root
        return path.relative(repoRoot, path.resolve(process.cwd(), value));
      },
    }).argv;

  build({
    platform: params.platform as Platform,
    projectRoot: params["project-root"],
  });
}

main();
