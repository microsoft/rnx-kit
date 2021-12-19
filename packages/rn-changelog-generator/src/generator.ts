#!/usr/bin/env node

import levenshtein from "fast-levenshtein";
import util from "util";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import pLimit from "p-limit";
import deepmerge from "deepmerge";
import child_process from "child_process";
import fetchCommits, { Commit } from "./utils/fetchCommits";

const execFile = util.promisify(child_process.execFile);

const CHANGE_TYPE = [
  "breaking",
  "added",
  "changed",
  "deprecated",
  "removed",
  "fixed",
  "security",
  "unknown",
  "failed",
] as const;

const CHANGE_CATEGORY = ["android", "ios", "general", "internal"] as const;

export const CHANGES_TEMPLATE: Changes = Object.freeze(
  CHANGE_TYPE.reduce(
    (acc, key) => ({
      ...acc,
      [key]: Object.freeze(
        CHANGE_CATEGORY.reduce((a, c) => ({ ...a, [c]: [] }), {})
      ),
    }),
    {}
  )
) as Changes;

const CHANGELOG_LINE_REGEXP = new RegExp(
  `(\\[(${[...CHANGE_TYPE, ...CHANGE_CATEGORY].join("|")})\\]s*)+`,
  "i"
);

export type PlatformChanges = Record<typeof CHANGE_CATEGORY[number], string[]>;

export type Changes = Record<typeof CHANGE_TYPE[number], PlatformChanges>;

//#region FILTER COMMITS
//*****************************************************************************

function filterCICommits(commits: Commit[]) {
  console.warn(chalk.green("Filter CI commits"));
  console.group();
  const result = commits.filter((item) => {
    const text = item.commit.message.toLowerCase();
    if (
      text.includes("travis") ||
      text.includes("circleci") ||
      text.includes("circle ci") ||
      text.includes("bump version numbers") ||
      text.includes("docker")
    ) {
      console.warn(chalk.yellow(formatCommitLink(item.sha)));
      return false;
    } else {
      return true;
    }
  });
  console.groupEnd();
  return result;
}

function filterRevertCommits(commits: Commit[]) {
  console.warn(chalk.green("Filter revert commits"));
  console.group();
  let revertCommits: string[] = [];
  const pattern = /\b(revert d\d{8}: |revert\b|back out ".*")/i;
  const filteredCommits = commits
    .filter((item) => {
      const text = item.commit.message.split("\n")[0].toLowerCase();
      if (pattern.test(text)) {
        revertCommits.push(text.replace(pattern, ""));
        console.warn(chalk.yellow(formatCommitLink(item.sha)));
        return false;
      }
      return true;
    })
    .filter((item) => {
      const text = item.commit.message.split("\n")[0].toLowerCase();
      revertCommits.forEach((revertCommit) => {
        if (levenshtein.get(text, revertCommit) < 0.5 * revertCommit.length) {
          revertCommits = revertCommits.filter(function (e) {
            return e !== revertCommit;
          });
          return false;
        }
        return false;
      });
      return true;
    });
  if (revertCommits.length > 0) {
    console.error(
      chalk.redBright(
        "Unable to find the following commits that were reverted, remove them manually or document their reversal."
      )
    );
    console.group();
    revertCommits.forEach((commit) =>
      console.warn(chalk.red(formatCommitLink(commit)))
    );
    console.groupEnd();
  }
  console.groupEnd();
  return filteredCommits;
}

/**
 * @todo Perhaps it's more performant to first parse all commit SHAs out of the
 *       existing changelog data.
 */
function filterPreviouslyPickedCommits(
  existingChangelogData: string,
  commits: Commit[]
) {
  console.warn(chalk.green("Filter previously picked commits"));
  console.group();
  const result = commits.filter(({ sha }) => {
    if (existingChangelogData.includes(sha)) {
      console.warn(chalk.yellow(formatCommitLink(sha)));
      return false;
    }
    return true;
  });
  console.groupEnd();
  return result;
}

//*****************************************************************************
//#endregion

//#region GIT INTERACTIONS
//*****************************************************************************

export async function git(gitDir: string, ...args: string[]) {
  const out = await execFile("git", [`--git-dir=${gitDir}`, ...args]);
  if (out.stderr) {
    throw new Error(out.stderr);
  }
  return out.stdout.trimRight();
}

/**
 * Finds a commit on the `main` branch, based on the ‘differential revision’
 * that FB's infrastructure adds to each commit that lands in the `main`
 * branch. This ensures that we always use the canonical commit ref as it
 * exists in the `main` branch, rather than a new cherry-picked commit ref.
 */
export async function getOriginalCommit(
  gitDir: string,
  item: Commit
): Promise<Commit | null> {
  const match = item.commit.message.match(/Differential Revision: (D\d+)/m);
  if (match) {
    const sha = await git(
      gitDir,
      "log",
      "main",
      "--pretty=format:%H",
      `--grep=${match[0]}`
    );
    if (sha === "") {
      throw new Error(
        `Expected a commit to match ${match[1]}, is your \`main\` branch out of date?`
      );
    }
    if (sha.includes("\n")) {
      throw new Error(
        `Expected a single commit to match ${match[1]}, but got: ${sha
          .split("\n")
          .join(", ")}`
      );
    }
    console.warn(
      chalk.yellow(
        `${formatCommitLink(item.sha)} -> ${match[1]} -> ${formatCommitLink(
          sha
        )}`
      )
    );
    return { ...item, sha } as Commit;
  } else {
    return Promise.resolve(null);
  }
}

/**
 * Maps all commits to their canonical commit refs.
 *
 * @see {getOriginalCommit}
 */
async function getOriginalCommits(
  gitDir: string,
  commits: Commit[],
  concurrentProcesses: number
) {
  console.warn(chalk.green("Resolve original commits"));
  console.group();
  const unresolved: string[] = [];
  const limit = pLimit(concurrentProcesses);
  try {
    const results = await Promise.all(
      commits.map((original) => {
        return limit(() =>
          getOriginalCommit(gitDir, original).then((resolved) => {
            if (resolved === null) {
              unresolved.push(original.sha);
            }
            return resolved || original;
          })
        );
      })
    );
    if (unresolved.length > 0) {
      console.error(
        chalk.redBright(
          "Unable to find differential revisions for the following commits. If these were made on the release branch only, be sure to update the CHANGELOG entries to point to the commit on the main branch after back-porting."
        )
      );
      console.group();
      unresolved.forEach((sha) =>
        console.warn(chalk.red(formatCommitLink(sha)))
      );
      console.groupEnd();
    }
    console.groupEnd();
    return results;
  } catch (e) {
    console.groupEnd();
    throw e;
  }
}

/**
 * Resolves the ref to the first commit after the tree was forked from the
 * `main` branch.
 */
export async function getFirstCommitAfterForkingFromMain(
  gitDir: string,
  ref: string
) {
  const out = await git(
    gitDir,
    "rev-list",
    `^${ref}`,
    "--first-parent",
    "main"
  );
  const components = out.split("\n");
  return components[components.length - 1];
}

/**
 * Resolves both `base` and `compare` to the first commit after forking from
 * the `main` branch. In case the result is the same for both, then the delta
 * between the two is in the PATCH version range and we should *not* use the
 * offset, as the changes we need to consider are all in the `compare` tree.
 */
export async function getOffsetBaseCommit(
  gitDir: string,
  base: string,
  compare: string
) {
  console.warn(chalk.green("Resolve base commit"));
  console.group();
  try {
    const [offsetBase, offsetCompare] = await Promise.all([
      getFirstCommitAfterForkingFromMain(gitDir, base),
      getFirstCommitAfterForkingFromMain(gitDir, compare),
    ]);
    if (offsetBase === offsetCompare) {
      return git(gitDir, "rev-list", "-n", "1", base);
    } else {
      return offsetBase;
    }
  } catch (e) {
    console.groupEnd();
    throw e;
  }
}

//*****************************************************************************
//#endregion

//#region UTILITIES
//*****************************************************************************

function isAndroidCommit(change: string) {
  return (
    !/(\[ios\]|\[general\])/i.test(change) &&
    (/\b(android|java)\b/i.test(change) || /android/i.test(change))
  );
}

function isIOSCommit(change: string) {
  return (
    !/(\[android\]|\[general\])/i.test(change) &&
    (/\b(ios|xcode|swift|objective-c|iphone|ipad)\b/i.test(change) ||
      /ios\b/i.test(change) ||
      /\brct/i.test(change))
  );
}

function isBreaking(change: string) {
  return /\b(breaking)\b/i.test(change);
}

function isAdded(change: string) {
  return /\b(added)\b/i.test(change);
}

function isChanged(change: string) {
  return /\b(changed)\b/i.test(change);
}

function isDeprecated(change: string) {
  return /\b(deprecated)\b/i.test(change);
}

function isRemoved(change: string) {
  return /\b(removed)\b/i.test(change);
}

function isFixed(change: string) {
  return /\b(fixed)\b/i.test(change);
}

function isSecurity(change: string) {
  return /\b(security)\b/i.test(change);
}

function isFabric(change: string) {
  return /\b(fabric)\b/i.test(change);
}

function isTurboModules(change: string) {
  return /\b(tm)\b/i.test(change);
}

function isInternal(change: string) {
  return /\[internal\]/i.test(change);
}

//*****************************************************************************
//#endregion

//#region FORMATTING
//*****************************************************************************

function formatCommitLink(sha: string) {
  return `https://github.com/facebook/react-native/commit/${sha}`;
}

export function getChangeMessage(item: Commit, onlyMessage = false) {
  const commitMessage = item.commit.message.split("\n");
  let entry =
    commitMessage
      .reverse()
      .find((a) => /\[ios\]|\[android\]|\[general\]/i.test(a)) ||
    commitMessage.reverse()[0];
  entry = entry.replace(/^((changelog:\s*)?(\[\w+\]\s?)+[\s-]*)/i, ""); //Remove the [General] [whatever]
  entry = entry.replace(/ \(#\d*\)$/i, ""); //Remove the PR number if it's on the end

  // Capitalize
  if (/^[a-z]/.test(entry)) {
    entry = entry.slice(0, 1).toUpperCase() + entry.slice(1);
  }

  if (onlyMessage) {
    return entry;
  }

  const authorSection = `([${item.sha.slice(0, 10)}](${formatCommitLink(
    item.sha
  )})${
    item.author
      ? " by [@" +
        item.author.login +
        "](https://github.com/" +
        item.author.login +
        ")"
      : ""
  })`;
  return `- ${entry} ${authorSection}`;
}

export function getChangelogDesc(
  commits: Commit[],
  verbose: boolean,
  onlyMessage = false
) {
  const acc = deepmerge(CHANGES_TEMPLATE, {});
  const commitsWithoutExactChangelogTemplate: string[] = [];

  commits.forEach((item) => {
    let change = item.commit.message.split("\n").find((line) => {
      return CHANGELOG_LINE_REGEXP.test(line);
    });
    if (!change) {
      commitsWithoutExactChangelogTemplate.push(item.sha);
      change = item.commit.message;
    }

    const message = getChangeMessage(item, onlyMessage);

    if (!verbose) {
      if (isFabric(change.split("\n")[0])) return;
      if (isTurboModules(change.split("\n")[0])) return;
      if (isInternal(change)) return;
    }

    if (isBreaking(change)) {
      if (isAndroidCommit(change)) {
        acc.breaking.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.breaking.ios.push(message);
      } else {
        acc.breaking.general.push(message);
      }
    } else if (isAdded(change)) {
      if (isAndroidCommit(change)) {
        acc.added.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.added.ios.push(message);
      } else {
        acc.added.general.push(message);
      }
    } else if (isChanged(change)) {
      if (isAndroidCommit(change)) {
        acc.changed.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.changed.ios.push(message);
      } else {
        acc.changed.general.push(message);
      }
    } else if (isFixed(change)) {
      if (isAndroidCommit(change)) {
        acc.fixed.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.fixed.ios.push(message);
      } else {
        acc.fixed.general.push(message);
      }
    } else if (isRemoved(change)) {
      if (isAndroidCommit(change)) {
        acc.removed.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.removed.ios.push(message);
      } else {
        acc.removed.general.push(message);
      }
    } else if (isDeprecated(change)) {
      if (isAndroidCommit(change)) {
        acc.deprecated.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.deprecated.ios.push(message);
      } else {
        acc.deprecated.general.push(message);
      }
    } else if (isSecurity(change)) {
      if (isAndroidCommit(change)) {
        acc.security.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.security.ios.push(message);
      } else {
        acc.security.general.push(message);
      }
    } else if (item.commit.message.match(/changelog/i)) {
      acc.failed.general.push(message);
    } else {
      if (isAndroidCommit(change)) {
        acc.unknown.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.unknown.ios.push(message);
      } else {
        acc.unknown.general.push(message);
      }
    }
  });

  if (commitsWithoutExactChangelogTemplate.length > 0) {
    console.warn(
      chalk.redBright(
        "Commits that have messages without following the exact changelog template"
      )
    );
    console.group();
    commitsWithoutExactChangelogTemplate.forEach((sha) => {
      console.warn(chalk.red(formatCommitLink(sha)));
    });
    console.groupEnd();
  }

  return acc;
}

function buildMarkDown(currentVersion: string, data: Changes) {
  return `

## ${currentVersion}

### Breaking

${data.breaking.general.join("\n")}

#### Android specific

${data.breaking.android.join("\n")}

#### iOS specific

${data.breaking.ios.join("\n")}

### Added

${data.added.general.join("\n")}

#### Android specific

${data.added.android.join("\n")}

#### iOS specific

${data.added.ios.join("\n")}

### Changed

${data.changed.general.join("\n")}

#### Android specific

${data.changed.android.join("\n")}

#### iOS specific

${data.changed.ios.join("\n")}

### Deprecated

${data.deprecated.general.join("\n")}

#### Android specific

${data.deprecated.android.join("\n")}

#### iOS specific

${data.deprecated.ios.join("\n")}

### Removed

${data.removed.general.join("\n")}

#### Android specific

${data.removed.android.join("\n")}

#### iOS specific

${data.removed.ios.join("\n")}

### Fixed

${data.fixed.general.join("\n")}

#### Android specific

${data.fixed.android.join("\n")}

#### iOS specific

${data.fixed.ios.join("\n")}

### Security

${data.security.general.join("\n")}

#### Android specific

${data.security.android.join("\n")}

#### iOS specific

${data.security.ios.join("\n")}

### Unknown

${data.unknown.general.join("\n")}

#### Android Unknown

${data.unknown.android.join("\n")}

#### iOS Unknown

${data.unknown.ios.join("\n")}

#### Failed to parse

${data.failed.general.join("\n")}
`;
}

//*****************************************************************************
//#endregion

//#region MAIN
//*****************************************************************************

export async function getAllChangelogDescriptions(
  commits: Commit[],
  options: {
    gitDir: string;
    maxWorkers: number;
    existingChangelogData: string;
    verbose?: boolean;
    renderOnlyMessage?: boolean;
  }
) {
  const commits_1 = await Promise.resolve(commits);
  const commits_2 = await filterCICommits(commits_1);
  const commits_3 = await filterRevertCommits(commits_2);
  const commits_4 = await getOriginalCommits(
    options.gitDir,
    commits_3,
    options.maxWorkers
  );
  const commits_5 = filterPreviouslyPickedCommits(
    options.existingChangelogData,
    commits_4
  );
  return getChangelogDesc(
    commits_5,
    !!options.verbose,
    !!options.renderOnlyMessage
  );
}

export async function run(
  options: Parameters<typeof getAllChangelogDescriptions>[1] & {
    token: string | null;
    base: string;
    compare: string;
  }
) {
  const commits_1 = await fetchCommits(
    options.token,
    options.base,
    options.compare
  );
  const changes = await getAllChangelogDescriptions(commits_1, options);
  return buildMarkDown(options.compare, changes);
}

interface GenerateArgs {
  base: string;
  compare: string;
  repo: string;
  changelog: string;
  token: string | null;
  maxWorkers: number;
  verbose: boolean;
}

function handler(argv: GenerateArgs) {
  const gitDir = path.join(argv.repo, ".git");
  git(gitDir, "rev-parse")
    .catch(() => {
      throw new Error(
        "Specified path to react-native repo is not a valid git repo."
      );
    })
    .then(async () => {
      const existingChangelogData = fs.readFileSync(argv.changelog, "utf-8");
      const base = await getOffsetBaseCommit(gitDir, argv.base, argv.compare);
      const data = await run({ ...argv, base, gitDir, existingChangelogData });
      return console.log(data);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export default {
  handler,
  args: {
    base: {
      alias: "b",
      string: true,
      describe:
        "The base branch/tag/commit to compare against (most likely the previous stable version)",
      demandOption: true,
    },
    compare: {
      alias: "c",
      string: true,
      describe:
        "The new version branch/tag/commit (most likely the latest release candidate)",
      demandOption: true,
    },
    repo: {
      alias: "r",
      string: true,
      describe: "The path to an up-to-date clone of the react-native repo",
      demandOption: true,
    },
    changelog: {
      alias: "f",
      string: true,
      describe: "The path to the existing CHANGELOG.md file",
      demandOption: true,
      default: path.resolve(__dirname, "../CHANGELOG.md"),
    },
    token: {
      alias: "t",
      string: true,
      describe:
        "A GitHub token that has `public_repo` access (generate at https://github.com/settings/tokens)",
      demandOption: false,
      default: null,
    },
    maxWorkers: {
      alias: "w",
      number: true,
      describe:
        "Specifies the maximum number of concurrent sub-processes that will be spawned",
      default: 10,
    },
    verbose: {
      alias: "v",
      boolean: true,
      describe:
        "Verbose listing, includes internal changes as well as public-facing changes",
      demandOption: false,
      default: false,
    },
  },
};

//*****************************************************************************
//#endregion
