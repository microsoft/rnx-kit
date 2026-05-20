import changesetsConfig from "../.changeset/config.json" with { type: "json" };
import {
  getBaseCommit,
  getChangedFiles,
  git,
} from "../incubator/tools-git/src/index.ts"; // deep import to avoid cycles

function parseVersion(version: string): number {
  const [major, minor = 0, patch = 0] = version.split(".");
  return Number(major) * 1000000 + Number(minor) * 1000 + Number(patch);
}

function main(targetBranch: string | undefined): number {
  const baseCommit = getBaseCommit(targetBranch, changesetsConfig.baseBranch);
  if (!baseCommit) {
    return 1;
  }

  let errors = 0;
  for (const file of getChangedFiles(baseCommit)) {
    if (!file.endsWith("package.json")) {
      continue;
    }

    const diff = git("diff", baseCommit, file);
    const matches = Array.from(diff.matchAll(/"node": "[^\d]*([.\d]+)"/g));
    if (matches.length < 2) {
      continue;
    }

    const prev = matches[0][1];
    const next = matches[1][1];
    if (parseVersion(next) < parseVersion(prev)) {
      errors++;
      console.error(
        `❌ ${file}: minimum Node version downgraded from ${prev} to ${next}`
      );
    }
  }

  return errors;
}

const { [2]: targetBranch } = process.argv;
process.exitCode = main(targetBranch);
