import { execFile, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import type { AgentChangedFile } from "../types.ts";

const execFileAsync = promisify(execFile);

/**
 * Runs `git` and returns its output untrimmed; e.g. the last line of a diff
 * may be a context line consisting of a single space. Throws if it fails.
 */
export async function git(
  cwd: string,
  args: string[],
  env?: Record<string, string>
): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf-8",
    maxBuffer: Infinity,
  });
  return stdout;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agent-evals-"));
}

/**
 * Checks out `commit` in a temporary worktree of `root`, without installing
 * dependencies, and returns its path. The worktree is removed when the
 * process exits, i.e. after promptfoo has run all assertions.
 */
export async function addWorktree(
  root: string,
  commit: string
): Promise<string> {
  const workdir = makeTempDir();
  // Fixtures in rnx-kit exceed the 260 character path limit on Windows
  const longPaths = ["-c", "core.longpaths=true"];
  process.once("exit", () => {
    const args = [...longPaths, "worktree", "remove", "--force", workdir];
    if (spawnSync("git", args, { cwd: root }).status !== 0) {
      fs.rmSync(workdir, { recursive: true, force: true, maxRetries: 3 });
    }
  });
  await git(root, [
    ...longPaths,
    "worktree",
    "add",
    "--detach",
    workdir,
    commit,
  ]);
  return workdir;
}

const STATUS: Record<string, AgentChangedFile["status"]> = {
  A: "added",
  D: "deleted",
  R: "renamed",
};

/**
 * Returns the files in the working tree of `workdir` that changed relative to
 * `commit`, including uncommitted and untracked files, and the unified diff.
 * Untracked files are added to a temporary copy of the index, so the
 * repository's own index is not modified.
 */
export async function collectChanges(
  workdir: string,
  commit: string
): Promise<{ files: AgentChangedFile[]; diff: string }> {
  const dir = makeTempDir();
  try {
    const index = path.resolve(
      workdir,
      (await git(workdir, ["rev-parse", "--git-path", "index"])).trim()
    );
    const env = { GIT_INDEX_FILE: path.join(dir, "index") };
    if (fs.existsSync(index)) {
      fs.copyFileSync(index, env.GIT_INDEX_FILE);
    }

    // Include untracked files in the diff
    await git(workdir, ["add", "--intent-to-add", "--all"], env);

    // Ignore user config that changes the output, e.g. `diff.noprefix`
    const diffArgs = [
      "-c",
      "core.quotePath=false",
      "diff",
      "--find-renames",
      "--no-ext-diff",
      "--no-color",
      "--src-prefix=a/",
      "--dst-prefix=b/",
    ];
    const diff = await git(workdir, [...diffArgs, commit, "--"], env);
    const nameStatus = await git(
      workdir,
      [...diffArgs, "--name-status", "-z", commit, "--"],
      env
    );

    const files: AgentChangedFile[] = [];
    const tokens = nameStatus.split("\0");
    for (let i = 0; i < tokens.length - 1;) {
      const code = tokens[i][0];
      const file = tokens[i + (code === "R" ? 2 : 1)];
      i += code === "R" ? 3 : 2;

      const status = STATUS[code] ?? "modified";
      const change: AgentChangedFile = { path: file, status };
      if (status !== "deleted") {
        try {
          change.content = fs.readFileSync(path.join(workdir, file), "utf-8");
        } catch (_) {
          // Not a regular file, e.g. a submodule
        }
      }
      files.push(change);
    }

    return { files, diff };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
}
