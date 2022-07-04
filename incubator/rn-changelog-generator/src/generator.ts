#!/usr/bin/env node

import levenshtein from "fast-levenshtein";
import util from "util";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import pLimit from "p-limit";
import deepmerge from "deepmerge";
import child_process from "child_process";
import { fetchCommits, Commit } from "./utils/commits";
import getChangeMessage from "./utils/getChangeMessage";
import formatCommitLink from "./utils/formatCommitLink";
import getChangeDimensions, {
  CHANGE_TYPE,
  CHANGE_CATEGORY,
  ChangeType,
  ChangeCategory,
} from "./utils/getChangeDimensions";

const execFile = util.promisify(child_process.execFile);

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

export type PlatformChanges = Record<ChangeCategory, string[]>;

export type Changes = Record<ChangeType, PlatformChanges>;

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

function filterSyncCommits(commits: Commit[]) {
  console.warn(chalk.green("Filter sync commits"));
  console.group();
  const result = commits.filter(({ commit, sha }) => {
    const isSyncCommit = commit.message.includes(
      "React Native sync for revisions"
    );
    if (isSyncCommit) {
      console.warn(chalk.yellow(formatCommitLink(sha)));
    }
    return !isSyncCommit;
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

//#region FORMATTING
//*****************************************************************************

export function getChangelogDesc(
  commits: Commit[],
  verbose: boolean,
  onlyMessage = false
) {
  const acc = deepmerge(CHANGES_TEMPLATE, {});
  const commitsWithoutExactChangelogTemplate: string[] = [];

  commits.forEach((item) => {
    const {
      changeCategory,
      changeType,
      doesNotFollowTemplate,
      fabric,
      internal,
      turboModules,
    } = getChangeDimensions(item);

    if (doesNotFollowTemplate) {
      commitsWithoutExactChangelogTemplate.push(item.sha);
    }

    if (!verbose && (fabric || turboModules || internal)) {
      return;
    }
    const message = getChangeMessage(item, onlyMessage);

    if (changeType === "failed") {
      acc[changeType].general.push(message);
    } else {
      acc[changeType][changeCategory].push(message);
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

type RunOptions = GenerateArgs & {
  gitDir: string;
  existingChangelogData: string;
  renderOnlyMessage?: boolean;
};

export async function getAllChangelogDescriptions(
  commits: Commit[],
  options: RunOptions
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
  const commits_6 = filterSyncCommits(commits_5);
  return getChangelogDesc(
    commits_6,
    options.verbose,
    !!options.renderOnlyMessage
  );
}

export async function run(options: RunOptions) {
  const commits = await fetchCommits(
    options.token,
    options.base,
    options.compare
  );
  const changes = await getAllChangelogDescriptions(commits, options);
  return buildMarkDown(options.compare, changes);
}

type GenerateArgs = {
  base: string;
  compare: string;
  repo: string;
  changelog: string;
  token: string | null;
  maxWorkers: number;
  verbose: boolean;
};

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
      const newChangeLogData = await run({
        ...argv,
        base,
        gitDir,
        existingChangelogData,
      });

      const changelogHeader = "# Changelog";
      fs.writeFileSync(argv.changelog, changelogHeader, {
        encoding: "utf8",
        flag: "w",
      });
      fs.appendFileSync(argv.changelog, newChangeLogData);
      fs.appendFileSync(
        argv.changelog,
        existingChangelogData.substring(
          existingChangelogData.indexOf(changelogHeader) +
            changelogHeader.length
        )
      );
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
