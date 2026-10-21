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
  parseGitmodulesConfig,
  parseLsRemoteRef,
  pickTag,
  resolveSubmoduleUrl,
  validateCloneOrigin,
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

  it("accepts file entries (root and nested) alongside directories", async () => {
    repo = await initRepoWithFiles(tempDir, {
      LICENSE: "l",
      "base/a.cc": "a",
      "tools/t.py": "t",
      "tools/deep/x.py": "x",
      "other/d.txt": "d",
    });

    await repo.sparseCheckoutInit();
    await repo.sparseCheckoutSet("LICENSE", "base", "tools/t.py");

    assert.ok(fs.existsSync(path.join(tempDir, "LICENSE")));
    assert.ok(fs.existsSync(path.join(tempDir, "base", "a.cc")));
    assert.ok(fs.existsSync(path.join(tempDir, "tools", "t.py")));
    assert.ok(!fs.existsSync(path.join(tempDir, "tools", "deep", "x.py")));
    assert.ok(!fs.existsSync(path.join(tempDir, "other", "d.txt")));

    const files = await listFilesWithExclusions(repo, undefined, [
      "LICENSE",
      "base",
      "tools/t.py",
    ]);
    assert.deepStrictEqual(files.sort(), [
      "LICENSE",
      "base/a.cc",
      "tools/t.py",
    ]);
  });
});

describe("GitRepo snapshot plumbing", () => {
  it("lsTreeEntries lists blobs and gitlinks with full paths", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "a/x.txt": "x",
      "b/y.txt": "y",
    });
    const sub = "1".repeat(40);
    await spawn(
      "git",
      ["update-index", "--add", "--cacheinfo", `160000,${sub},a/sub`],
      { cwd: tempDir }
    );
    await spawn("git", ["commit", "-m", "gitlink"], { cwd: tempDir });

    const entries = await repo.lsTreeEntries("HEAD", ["a"]);
    assert.deepStrictEqual(
      entries.map((e) => [e.mode, e.type, e.path]),
      [
        ["160000", "commit", "a/sub"],
        ["100644", "blob", "a/x.txt"],
      ]
    );
    assert.strictEqual(entries[0].oid, sub);
  });

  it("buildTree + commitTree write exactly the given entries; deletedPaths diffs them", async () => {
    repo = await initRepoWithFiles(tempDir, {
      "keep.txt": "k",
      "drop.txt": "d",
      "dir/z.txt": "z",
    });
    const all = await repo.lsTreeEntries("HEAD");
    const missingBlob = "2".repeat(40);
    const tree = await repo.buildTree([
      ...all.filter((e) => e.path !== "drop.txt"),
      { mode: "100644", type: "blob", oid: missingBlob, path: "new/n.txt" },
    ]);
    const head = await repo.revParse("HEAD");
    const commit = await repo.commitTree(tree, [head], "synthetic");

    const entries = await repo.lsTreeEntries(commit);
    assert.deepStrictEqual(
      entries.map((e) => e.path),
      ["dir/z.txt", "keep.txt", "new/n.txt"]
    );
    assert.strictEqual(entries[2].oid, missingBlob);
    assert.strictEqual(await repo.revParse(`${commit}^`), head);
    assert.deepStrictEqual(await repo.deletedPaths(head, commit), ["drop.txt"]);
    // The working index is untouched
    assert.strictEqual(await repo.statusPorcelain(), "");
  });

  it("buildTree and lsTreeEntries round-trip unusual file names", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    const names = [
      "sp ace/f.txt",
      "tab\there.txt",
      "new\nline.txt",
      "ünïcødé €/😀.txt",
      "-leading-dash.txt",
      "[glob]*?.txt",
      'quote"s.txt',
    ].sort();
    const oid = "5".repeat(40);
    const tree = await repo.buildTree(
      names.map((p) => ({ mode: "100644", type: "blob", oid, path: p }))
    );
    const entries = await repo.lsTreeEntries(tree);
    assert.deepStrictEqual(entries.map((e) => e.path).sort(), names);
  });

  it("buildTree of no entries is the empty tree", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    assert.strictEqual(
      await repo.buildTree([]),
      "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
    );
  });

  it("readGitmodules parses .gitmodules at a commit", async () => {
    repo = await initRepoWithFiles(tempDir, {
      ".gitmodules":
        '[submodule "third_party/x.y"]\n\tpath = third_party/x.y/src\n\turl = ../x\n' +
        '[submodule "z"]\n\tpath = z/\n\turl = https://example.com/z\n',
    });
    assert.deepStrictEqual(await repo.readGitmodules("HEAD"), [
      { name: "third_party/x.y", path: "third_party/x.y/src", url: "../x" },
      { name: "z", path: "z", url: "https://example.com/z" },
    ]);
  });

  it("readGitmodules returns [] without .gitmodules", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    assert.deepStrictEqual(await repo.readGitmodules("HEAD"), []);
  });

  it("hasCommit and listMissingObjects", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    const head = await repo.revParse("HEAD");
    assert.strictEqual(await repo.hasCommit(head), true);
    assert.strictEqual(await repo.hasCommit("3".repeat(40)), false);
    assert.deepStrictEqual(await repo.listMissingObjects([head]), []);

    const missingBlob = "4".repeat(40);
    const tree = await repo.buildTree([
      { mode: "100644", type: "blob", oid: missingBlob, path: "m.txt" },
    ]);
    const commit = await repo.commitTree(tree, [], "missing blob");
    assert.deepStrictEqual(await repo.listMissingObjects([commit]), [
      missingBlob,
    ]);
  });
});

describe("remote and submodule URL helpers", () => {
  it("parseLsRemoteRef prefers the peeled tag", () => {
    const out =
      "1111111111111111111111111111111111111111\trefs/tags/v1\n" +
      "2222222222222222222222222222222222222222\trefs/tags/v1^{}\n" +
      "3333333333333333333333333333333333333333\trefs/tags/x/refs/tags/v1\n";
    assert.strictEqual(parseLsRemoteRef(out, "refs/tags/v1"), "2".repeat(40));
  });

  it("parseLsRemoteRef handles lightweight tags and misses", () => {
    const out = "1111111111111111111111111111111111111111\trefs/tags/v1\n";
    assert.strictEqual(parseLsRemoteRef(out, "refs/tags/v1"), "1".repeat(40));
    assert.strictEqual(parseLsRemoteRef(out, "refs/tags/v2"), "");
    assert.strictEqual(parseLsRemoteRef("", "refs/tags/v1"), "");
  });

  it("parseGitmodulesConfig ignores incomplete sections", () => {
    const out =
      "submodule.a.path\na\0submodule.a.url\nhttps://x/a\0" +
      "submodule.b.path\nb\0submodule.a.branch\nmain\0";
    assert.deepStrictEqual(parseGitmodulesConfig(out), [
      { name: "a", path: "a", url: "https://x/a" },
    ]);
  });

  it("resolveSubmoduleUrl resolves relative URLs like git", () => {
    const sup = "https://host/org/super";
    assert.strictEqual(
      resolveSubmoduleUrl("../lib", sup),
      "https://host/org/lib"
    );
    assert.strictEqual(
      resolveSubmoduleUrl("./lib", `${sup}.git`),
      "https://host/org/super/lib"
    );
    assert.strictEqual(resolveSubmoduleUrl("https://a/b", sup), "https://a/b");
  });

  it("validateCloneOrigin accepts non-GitHub URLs", async () => {
    repo = await initRepoWithFiles(tempDir, { "a.txt": "a" });
    await repo.configSet("remote.origin.url", "file:///c:/up/super.git");
    assert.strictEqual(
      (await validateCloneOrigin(repo, "file:///c:/up/super.git")).valid,
      true
    );
    assert.strictEqual(
      (
        await validateCloneOrigin(
          repo,
          "https://chromium.googlesource.com/chromium/src"
        )
      ).valid,
      false
    );
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
