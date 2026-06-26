// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { normalizePath } from "../src/modules/fs.ts";
import {
  GitRepo,
  getAllowedRelativePaths,
  listFilesWithExclusions,
  pickTag,
} from "../src/modules/git.ts";
import { spawn } from "../src/modules/proc.ts";

// =============================================================================
// Helpers
// =============================================================================

let tempDir: string;
let repo: GitRepo;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "git-test-"));
}

function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Create a file with content, creating parent directories as needed. */
function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

/** Initialize a git repo, create files, and make an initial commit. */
async function initRepoWithFiles(
  dir: string,
  files: Record<string, string>
): Promise<GitRepo> {
  await spawn("git", ["init"], { cwd: dir });
  await spawn("git", ["config", "user.email", "test@test.com"], { cwd: dir });
  await spawn("git", ["config", "user.name", "Test"], { cwd: dir });
  await spawn("git", ["config", "commit.gpgsign", "false"], { cwd: dir });

  for (const [filePath, content] of Object.entries(files)) {
    writeFile(path.join(dir, filePath), content);
  }

  await spawn("git", ["add", "-A"], { cwd: dir });
  await spawn("git", ["commit", "-m", "initial"], { cwd: dir });

  return new GitRepo(dir);
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  tempDir = createTempDir();
});

afterEach(() => {
  cleanupTempDir(tempDir);
});

describe("normalizePath", () => {
  it("converts backslashes to forward slashes", () => {
    assert.strictEqual(normalizePath("a\\b\\c"), "a/b/c");
  });

  it("leaves forward slashes unchanged", () => {
    assert.strictEqual(normalizePath("a/b/c"), "a/b/c");
  });

  it("handles empty string", () => {
    assert.strictEqual(normalizePath(""), "");
  });
});

describe("listFilesWithExclusions", () => {
  it("returns all tracked files when no exclude file", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "a.txt": "a",
      "b.txt": "b",
      "sub/c.txt": "c",
    });

    const files = await listFilesWithExclusions(repo);
    assert.deepStrictEqual(files.sort(), ["a.txt", "b.txt", "sub/c.txt"]);
  });

  it("returns all files when exclude file does not exist", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "a.txt": "a",
    });

    const files = await listFilesWithExclusions(
      repo,
      path.join(tempDir, ".syncignore")
    );
    assert.deepStrictEqual(files, ["a.txt"]);
  });

  it("excludes files matching .syncignore patterns (unanchored)", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "a.txt": "a",
      "b.log": "b",
      "sub/c.log": "c",
      "sub/d.txt": "d",
    });

    // Create .syncignore in the repo dir (where --exclude-per-directory finds it)
    writeFile(path.join(tempDir, ".syncignore"), "*.log\n");

    const syncIgnorePath = path.join(tempDir, ".syncignore");
    const files = await listFilesWithExclusions(repo, syncIgnorePath);
    assert.deepStrictEqual(files.sort(), ["a.txt", "sub/d.txt"]);
  });

  it("scopes listing to pathspec when provided", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "root.txt": "root",
      "sub/a.txt": "a",
      "sub/b.txt": "b",
      "other/c.txt": "c",
    });

    const files = await listFilesWithExclusions(repo, undefined, "sub");
    assert.deepStrictEqual(files.sort(), ["sub/a.txt", "sub/b.txt"]);
  });

  it("applies exclusions within pathspec scope", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "root.txt": "root",
      "sub/a.txt": "a",
      "sub/b.log": "b",
      "sub/deep/c.log": "c",
      "sub/deep/d.txt": "d",
    });

    // Place .syncignore inside sub/ directory
    writeFile(path.join(tempDir, "sub", ".syncignore"), "*.log\n");

    const syncIgnorePath = path.join(tempDir, "sub", ".syncignore");
    const files = await listFilesWithExclusions(repo, syncIgnorePath, "sub");
    assert.deepStrictEqual(files.sort(), ["sub/a.txt", "sub/deep/d.txt"]);
  });

  it("anchored patterns in .syncignore match relative to file location", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "sub/top.txt": "top-level in sub",
      "sub/deep/top.txt": "nested",
      "sub/other.txt": "other",
    });

    // Anchored pattern /top.txt should match sub/top.txt but NOT sub/deep/top.txt
    writeFile(path.join(tempDir, "sub", ".syncignore"), "/top.txt\n");

    const syncIgnorePath = path.join(tempDir, "sub", ".syncignore");
    const files = await listFilesWithExclusions(repo, syncIgnorePath, "sub");
    assert.deepStrictEqual(files.sort(), ["sub/deep/top.txt", "sub/other.txt"]);
  });

  it("scopes listing to multiple pathspecs (sparsePaths)", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "base/a.cc": "a",
      "base/deep/b.cc": "b",
      "sandbox/c.cc": "c",
      "build/d.gn": "d",
      "other/e.txt": "e",
      "root.txt": "root",
    });

    const files = await listFilesWithExclusions(repo, undefined, [
      "base",
      "sandbox",
    ]);
    assert.deepStrictEqual(files.sort(), [
      "base/a.cc",
      "base/deep/b.cc",
      "sandbox/c.cc",
    ]);
  });

  it("ignores empty pathspec entries", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "sub/a.txt": "a",
      "other/b.txt": "b",
    });

    const files = await listFilesWithExclusions(repo, undefined, ["", "sub"]);
    assert.deepStrictEqual(files.sort(), ["sub/a.txt"]);
  });

  it("treats an all-empty pathspec list as whole-repo", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "a.txt": "a",
      "sub/b.txt": "b",
    });

    const files = await listFilesWithExclusions(repo, undefined, [""]);
    assert.deepStrictEqual(files.sort(), ["a.txt", "sub/b.txt"]);
  });
});

describe("getAllowedRelativePaths", () => {
  it("returns all paths when no prefix to strip", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "a.txt": "a",
      "sub/b.txt": "b",
    });

    const paths = await getAllowedRelativePaths(repo);
    assert.deepStrictEqual(paths.sort(), ["a.txt", "sub/b.txt"]);
  });

  it("strips prefix from paths", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "sub/a.txt": "a",
      "sub/deep/b.txt": "b",
      "other/c.txt": "c",
    });

    const paths = await getAllowedRelativePaths(repo, undefined, "sub");
    assert.deepStrictEqual(paths.sort(), ["a.txt", "deep/b.txt"]);
  });

  it("with pathspec, only returns files under that prefix", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "root.txt": "root",
      "sub/a.txt": "a",
      "sub/deep/b.txt": "b",
      "other/c.txt": "c",
    });

    const paths = await getAllowedRelativePaths(repo, undefined, "sub", "sub");
    assert.deepStrictEqual(paths.sort(), ["a.txt", "deep/b.txt"]);
  });

  it("combines exclusions with prefix stripping and pathspec", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "root.txt": "root",
      "sub/a.txt": "a",
      "sub/b.log": "b",
      "sub/deep/c.txt": "c",
    });

    writeFile(path.join(tempDir, "sub", ".syncignore"), "*.log\n");

    const syncIgnorePath = path.join(tempDir, "sub", ".syncignore");
    const paths = await getAllowedRelativePaths(
      repo,
      syncIgnorePath,
      "sub",
      "sub"
    );
    assert.deepStrictEqual(paths.sort(), ["a.txt", "deep/c.txt"]);
  });

  it("multiple pathspecs with no prefix stripping (identity-mapped sparsePaths)", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "base/a.cc": "a",
      "base/deep/b.cc": "b",
      "sandbox/c.cc": "c",
      "other/d.txt": "d",
    });

    // sparsePaths semantics: prefixToStrip = "" (identity), pathspecs = the dirs.
    const paths = await getAllowedRelativePaths(repo, undefined, "", [
      "base",
      "sandbox",
    ]);
    assert.deepStrictEqual(paths.sort(), [
      "base/a.cc",
      "base/deep/b.cc",
      "sandbox/c.cc",
    ]);
  });

  it("multiple pathspecs honor .syncignore within the selected dirs", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "base/a.cc": "a",
      "base/test/skip.cc": "skip",
      "sandbox/c.cc": "c",
      "other/d.txt": "d",
    });

    // .syncignore at repo root (identity mapping) trims within the selection.
    writeFile(path.join(tempDir, ".syncignore"), "base/test/\n");

    const paths = await getAllowedRelativePaths(
      repo,
      path.join(tempDir, ".syncignore"),
      "",
      ["base", "sandbox"]
    );
    assert.deepStrictEqual(paths.sort(), ["base/a.cc", "sandbox/c.cc"]);
  });
});

describe("GitRepo sparse checkout", () => {
  it("sparseCheckoutInit and sparseCheckoutSet materialize only target dir", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "root.txt": "root",
      "sub/a.txt": "a",
      "sub/deep/b.txt": "b",
      "other/c.txt": "c",
    });

    await repo.sparseCheckoutInit();
    await repo.sparseCheckoutSet("sub");

    // Only sub/ files should be on disk (plus root-level files in cone mode)
    assert.ok(fs.existsSync(path.join(tempDir, "sub", "a.txt")));
    assert.ok(fs.existsSync(path.join(tempDir, "sub", "deep", "b.txt")));
    assert.ok(!fs.existsSync(path.join(tempDir, "other", "c.txt")));
  });

  it("sparseCheckoutDisable restores full working tree", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "root.txt": "root",
      "sub/a.txt": "a",
      "other/c.txt": "c",
    });

    await repo.sparseCheckoutInit();
    await repo.sparseCheckoutSet("sub");

    // other/c.txt should be gone
    assert.ok(!fs.existsSync(path.join(tempDir, "other", "c.txt")));

    await repo.sparseCheckoutDisable();

    // Now other/c.txt should be back
    assert.ok(fs.existsSync(path.join(tempDir, "other", "c.txt")));
  });

  it("multi-path sparse checkout materializes only the listed dirs, and pathspec-scoped listing matches (sparsePaths flow)", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "base/a.cc": "a",
      "sandbox/b.cc": "b",
      "build/c.gn": "c",
      "other/d.txt": "d",
    });

    await repo.sparseCheckoutInit();
    await repo.sparseCheckoutSet("base", "sandbox");

    // Only base/ and sandbox/ materialize on disk.
    assert.ok(fs.existsSync(path.join(tempDir, "base", "a.cc")));
    assert.ok(fs.existsSync(path.join(tempDir, "sandbox", "b.cc")));
    assert.ok(!fs.existsSync(path.join(tempDir, "build", "c.gn")));
    assert.ok(!fs.existsSync(path.join(tempDir, "other", "d.txt")));

    // git ls-files still reports the whole index (skip-worktree entries), so
    // scoping the listing to the same pathspecs keeps the copy set within what
    // was actually materialized.
    const files = await listFilesWithExclusions(repo, undefined, [
      "base",
      "sandbox",
    ]);
    assert.deepStrictEqual(files.sort(), ["base/a.cc", "sandbox/b.cc"]);
  });
});

describe("GitRepo.tagsPointingAt", () => {
  it("returns empty array when no tags point at the commit", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    const head = await repo.revParse("HEAD");
    const tags = await repo.tagsPointingAt(head);
    assert.deepStrictEqual(tags, []);
  });

  it("returns a single tag pointing at the commit", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    await spawn("git", ["tag", "v1.0.0"], { cwd: tempDir });

    const head = await repo.revParse("HEAD");
    const tags = await repo.tagsPointingAt(head);
    assert.deepStrictEqual(tags, ["v1.0.0"]);
  });

  it("returns multiple tags pointing at the same commit", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    await spawn("git", ["tag", "v1.0.0"], { cwd: tempDir });
    await spawn("git", ["tag", "release-1"], { cwd: tempDir });

    const head = await repo.revParse("HEAD");
    const tags = await repo.tagsPointingAt(head);
    assert.deepStrictEqual(tags.sort(), ["release-1", "v1.0.0"]);
  });

  it("does not return tags pointing at other commits", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    const first = await repo.revParse("HEAD");
    await spawn("git", ["tag", "v1.0.0"], { cwd: tempDir });

    writeFile(path.join(tempDir, "b.txt"), "b");
    await spawn("git", ["add", "-A"], { cwd: tempDir });
    await spawn("git", ["commit", "-m", "second"], { cwd: tempDir });
    await spawn("git", ["tag", "v2.0.0"], { cwd: tempDir });

    assert.deepStrictEqual(await repo.tagsPointingAt(first), ["v1.0.0"]);
    const second = await repo.revParse("HEAD");
    assert.deepStrictEqual(await repo.tagsPointingAt(second), ["v2.0.0"]);
  });
});

describe("pickTag", () => {
  it("returns empty string when there are no candidates", () => {
    assert.strictEqual(pickTag([], ""), "");
    assert.strictEqual(pickTag([], "v24.2.0"), "");
  });

  it("returns the only candidate", () => {
    assert.strictEqual(pickTag(["v24.3.0"], ""), "v24.3.0");
    assert.strictEqual(pickTag(["v24.3.0"], "v24.2.0"), "v24.3.0");
    assert.strictEqual(
      pickTag(["nightly-2026-05-18"], "v24.2.0"),
      "nightly-2026-05-18"
    );
  });

  it("picks first lexicographic candidate when there is no existing tag", () => {
    assert.strictEqual(
      pickTag(["v24.3.0", "nightly-2026-05-18", "alpha"], ""),
      "alpha"
    );
    assert.strictEqual(pickTag(["v25.0.0", "v24.3.0"], ""), "v24.3.0");
  });

  it("picks the longest-common-prefix match against the existing tag", () => {
    assert.strictEqual(
      pickTag(["v24.3.0", "nightly-2026-05-18"], "v24.2.0"),
      "v24.3.0"
    );
    assert.strictEqual(
      pickTag(["v25.0.0", "nightly-2026-05-18"], "v24.2.0"),
      "v25.0.0"
    );
  });

  it("breaks LCP ties lexicographically", () => {
    assert.strictEqual(
      pickTag(["v24.3.0", "v24.3.0-rc.1"], "v24.2.0"),
      "v24.3.0"
    );
    assert.strictEqual(
      pickTag(["v24.3.0-rc.1", "v24.3.0"], "v24.2.0"),
      "v24.3.0"
    );
  });

  it("falls back to first lexicographic candidate when no prefix matches", () => {
    assert.strictEqual(
      pickTag(["nightly", "preview", "rc"], "v24.2.0"),
      "nightly"
    );
  });

  it("is deterministic regardless of input order", () => {
    const a = pickTag(["v24.3.0", "v24.4.0", "v25.0.0"], "v24.2.0");
    const b = pickTag(["v25.0.0", "v24.4.0", "v24.3.0"], "v24.2.0");
    assert.strictEqual(a, b);
  });
});
