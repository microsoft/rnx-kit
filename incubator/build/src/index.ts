import { startBuild } from "./build";
import * as github from "./github";
import type { BuildParams } from "./types";

export function build(params: BuildParams): Promise<number> {
  const githubRepo = github.getRepositoryInfo();
  if (githubRepo) {
    return startBuild(github, githubRepo, params);
  }

  return Promise.reject("Unsupported repository");
}

build({ platform: "ios", projectRoot: "packages/test-app" });
