// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * End-to-end tests for the sync CLI against local file:// upstream fixtures.
 *
 * The fixture mirrors the Chromium layout fork-sync must handle:
 * - release tags on separate branches (v1 is not an ancestor of v2),
 * - a "src under parent" submodule (third_party/foo/src) and a whole-directory
 *   submodule (third_party/whole) whose .gitmodules URL is stale (needs a
 *   fallback URL for the newer pin),
 * - an unfollowed gitlink and a gitlink that appears in v2.
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { spawn } from "../src/modules/proc.ts";

const SYNC_SCRIPT = path.join(
  import.meta.dirname,
  "..",
  "src",
  import.meta.filename.endsWith(".ts") ? "sync.ts" : "sync.js"
);

let root: string;
let gitEnv: NodeJS.ProcessEnv;

// =============================================================================
// Helpers
// =============================================================================

async function git(cwd: string, ...args: string[]): Promise<string> {
  return spawn("git", args, { cwd, env: gitEnv });
}

function write(dir: string, files: Record<string, string | null>): void {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    if (content === null) {
      fs.rmSync(full, { force: true });
    } else {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, "utf-8");
    }
  }
}

function read(dir: string, rel: string): string | null {
  const full = path.join(dir, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf-8") : null;
}

/** Create an upstream "server" repo that allows partial and by-SHA fetches. */
async function initServer(dir: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true });
  await git(dir, "init", "--quiet", "--initial-branch=main");
  await git(dir, "config", "uploadpack.allowFilter", "true");
  await git(dir, "config", "uploadpack.allowAnySHA1InWant", "true");
}

/** Write files, re-apply gitlinks, commit; returns the new HEAD SHA. */
async function commit(
  dir: string,
  message: string,
  files: Record<string, string | null>,
  gitlinks: Record<string, string> = {}
): Promise<string> {
  write(dir, files);
  await git(dir, "add", "-A");
  for (const [p, sha] of Object.entries(gitlinks)) {
    await git(
      dir,
      "update-index",
      "--add",
      "--cacheinfo",
      `160000,${sha},${p}`
    );
  }
  await git(dir, "commit", "--quiet", "--allow-empty", "-m", message);
  return git(dir, "rev-parse", "HEAD");
}

function url(dir: string): string {
  return pathToFileURL(dir).href;
}

async function runSync(
  mainDir: string,
  args: string[]
): Promise<{ ok: boolean; output: string }> {
  try {
    const output = await spawn(
      "node",
      [SYNC_SCRIPT, "--dep", "lib", "--yes", "--log-level", "none", ...args],
      { cwd: mainDir, env: gitEnv }
    );
    return { ok: true, output };
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    return { ok: false, output: `${err.message ?? ""}\n${err.stderr ?? ""}` };
  }
}

function lines(...l: string[]): string {
  return l.join("\n") + "\n";
}

// =============================================================================
// Fixture
// =============================================================================

interface Fixture {
  superDir: string;
  fooDir: string;
  wholeDir: string;
  wholeStaleDir: string;
  shas: {
    s1: string;
    s3: string;
    f1: string;
    f2: string;
    w1: string;
    w2: string;
  };
}

async function createFixture(base: string): Promise<Fixture> {
  const fooDir = path.join(base, "foo.git");
  const wholeDir = path.join(base, "whole.git");
  const wholeStaleDir = path.join(base, "whole-stale.git");
  const superDir = path.join(base, "super.git");

  // Submodule "foo" (lives at third_party/foo/src)
  await initServer(fooDir);
  const f1 = await commit(fooDir, "F1", {
    "include/a.h": "a1\n",
    "include/b.h": "b1\n",
    "src/x.c": "x1\n",
    "docs/readme.md": "r1\n",
  });
  const f2 = await commit(fooDir, "F2", {
    "include/a.h": "a2\n",
    "include/b.h": null,
    "include/c.h": "c2\n",
    "docs/readme.md": "r2\n",
  });

  // Whole-directory submodule "whole"; the stale mirror only has W1.
  await initServer(wholeDir);
  const w1 = await commit(wholeDir, "W1", {
    "BUILD.gn": "w1\n",
    "lib/w.c": "wc1\n",
  });
  await git(base, "clone", "--quiet", wholeDir, wholeStaleDir);
  await git(wholeStaleDir, "config", "uploadpack.allowFilter", "true");
  await git(wholeStaleDir, "config", "uploadpack.allowAnySHA1InWant", "true");
  const w2 = await commit(wholeDir, "W2", { "BUILD.gn": "w2\n" });

  // Superproject
  await initServer(superDir);
  const gitmodules = (extra = "") =>
    lines(
      '[submodule "foo"]',
      "\tpath = third_party/foo/src",
      `\turl = ${url(fooDir)}`,
      '[submodule "whole"]',
      "\tpath = third_party/whole",
      `\turl = ${url(wholeStaleDir)}`,
      '[submodule "unused"]',
      "\tpath = base/third_party/unused",
      `\turl = ${url(fooDir)}`
    ) + extra;

  const s0 = await commit(
    superDir,
    "S0",
    {
      ".gitmodules": gitmodules(),
      "base/x.cc": lines("line1", "line2", "line3", "line4", "line5"),
      "base/y.cc": "y0\n",
      "base/OWNERS": "o0\n",
      "tools/t.py": "t0\n",
      LICENSE: "L0\n",
      "third_party/foo/BUILD.gn": "fb0\n",
    },
    {
      "third_party/foo/src": f1,
      "third_party/whole": w1,
      "base/third_party/unused": f1,
    }
  );
  void s0;

  // Release branch 1 (not on main) with tag v1
  await git(superDir, "checkout", "--quiet", "-b", "rel1");
  const s1 = await commit(
    superDir,
    "S1 release 1",
    { VERSION: "1\n" },
    {
      "third_party/foo/src": f1,
      "third_party/whole": w1,
      "base/third_party/unused": f1,
    }
  );
  await git(superDir, "tag", "v1");

  // Main moves on: upstream edits, a new file, pin bumps, a new gitlink
  await git(superDir, "checkout", "--quiet", "main");
  await commit(
    superDir,
    "S2",
    {
      ".gitmodules": gitmodules(
        lines(
          '[submodule "newsub"]',
          "\tpath = base/third_party/newsub",
          `\turl = ${url(fooDir)}`
        )
      ),
      "base/x.cc": lines("LINE1-upstream", "line2", "line3", "line4", "line5"),
      "base/y.cc": "y2\n",
      "base/OWNERS": "o2\n",
      "base/new.cc": "n2\n",
    },
    {
      "third_party/foo/src": f2,
      "third_party/whole": w2,
      "base/third_party/unused": f1,
      "base/third_party/newsub": f1,
    }
  );

  // Release branch 2 with tag v2
  await git(superDir, "checkout", "--quiet", "-b", "rel2");
  const s3 = await commit(
    superDir,
    "S3 release 2",
    { VERSION: "2\n" },
    {
      "third_party/foo/src": f2,
      "third_party/whole": w2,
      "base/third_party/unused": f1,
      "base/third_party/newsub": f1,
    }
  );
  await git(superDir, "tag", "v2");
  await git(superDir, "checkout", "--quiet", "main");

  return {
    superDir,
    fooDir,
    wholeDir,
    wholeStaleDir,
    shas: { s1, s3, f1, f2, w1, w2 },
  };
}

async function createMainRepo(
  dir: string,
  syncConfig: Record<string, unknown>,
  manifestExtra: Record<string, unknown> = {}
): Promise<void> {
  fs.mkdirSync(dir, { recursive: true });
  await git(dir, "init", "--quiet", "--initial-branch=main");
  write(dir, {
    ".gitignore": ".sync/\n",
    "sync-manifest.json": JSON.stringify(
      {
        version: 1,
        ...manifestExtra,
        dependencies: [{ name: "lib", localPath: "deps/lib" }],
      },
      null,
      2
    ),
    "deps/lib/sync-config.json": JSON.stringify(syncConfig, null, 2) + "\n",
  });
  await git(dir, "add", "-A");
  await git(dir, "commit", "--quiet", "-m", "init");
}

async function commitAll(dir: string, message: string): Promise<void> {
  await git(dir, "add", "-A");
  await git(dir, "commit", "--quiet", "--allow-empty", "-m", message);
}

// =============================================================================
// Tests
// =============================================================================

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sync-e2e-"));
  const globalConfig = path.join(root, "gitconfig");
  fs.writeFileSync(
    globalConfig,
    lines(
      "[user]",
      "\tname = Test",
      "\temail = test@test.com",
      "[commit]",
      "\tgpgsign = false",
      "[tag]",
      "\tgpgsign = false",
      "[init]",
      "\tdefaultBranch = main",
      "[core]",
      "\tautocrlf = false"
    )
  );
  gitEnv = {
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
  };
});

after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("sync (snapshot mode, submodules, keepLocalDeletions)", () => {
  let fx: Fixture;
  let mainDir: string;
  let libDir: string;

  before(async () => {
    const base = path.join(root, "snapshot");
    fs.mkdirSync(base);
    fx = await createFixture(base);
    mainDir = path.join(base, "main");
    libDir = path.join(mainDir, "deps", "lib");
    await createMainRepo(mainDir, {
      repo: url(fx.superDir),
      branch: "main",
      sparsePaths: ["base", "LICENSE"],
      fetchMode: "snapshot",
      submodules: {
        "third_party/foo/src": {},
        "third_party/whole": { fallbackUrls: [url(fx.wholeDir)] },
      },
      keepLocalDeletions: true,
      tag: "",
      lastSync: "",
    });
  });

  it("first sync imports the scope and followed submodules", async () => {
    const result = await runSync(mainDir, ["--tag", "v1"]);
    assert.ok(result.ok, result.output);

    assert.strictEqual(read(libDir, "base/y.cc"), "y0\n");
    assert.strictEqual(read(libDir, "base/OWNERS"), "o0\n");
    assert.strictEqual(read(libDir, "LICENSE"), "L0\n");
    assert.strictEqual(read(libDir, "third_party/foo/src/include/a.h"), "a1\n");
    assert.strictEqual(
      read(libDir, "third_party/foo/src/docs/readme.md"),
      "r1\n"
    );
    assert.strictEqual(read(libDir, "third_party/whole/BUILD.gn"), "w1\n");
    // Out of scope / unfollowed
    assert.strictEqual(read(libDir, "tools/t.py"), null);
    assert.strictEqual(read(libDir, "VERSION"), null);
    assert.strictEqual(read(libDir, "third_party/foo/BUILD.gn"), null);
    assert.ok(!fs.existsSync(path.join(libDir, "base/third_party/unused")));

    const config = JSON.parse(read(libDir, "sync-config.json")!);
    assert.strictEqual(config.commit, fx.shas.s1);
    assert.strictEqual(config.tag, "v1");
    assert.strictEqual(config.fetchMode, "snapshot");
    assert.strictEqual(config.keepLocalDeletions, true);
    assert.deepStrictEqual(Object.keys(config.submodules), [
      "third_party/foo/src",
      "third_party/whole",
    ]);

    await commitAll(mainDir, "vendor v1");
  });

  it("rolls across release branches, keeping local edits, prunes, and local-only files", async () => {
    // Fork delta, prunes, and local-only files
    write(libDir, {
      "base/x.cc": lines("line1", "line2", "line3", "line4", "LINE5-local"),
      "base/OWNERS": null,
      "third_party/foo/src/docs/readme.md": null,
      "base/local_only.cc": "mine\n",
      "NOTES.md": "local notes\n",
      // Hides a vendored upstream file: it must be reported as not updated
      ".syncignore": "/third_party/whole/lib/**\n",
    });
    await commitAll(mainDir, "fork changes");

    const result = await runSync(mainDir, ["--tag", "v2"]);
    assert.ok(result.ok, result.output);

    // 3-way merge against the v1 snapshot (not the branch point)
    assert.strictEqual(
      read(libDir, "base/x.cc"),
      lines("LINE1-upstream", "line2", "line3", "line4", "LINE5-local")
    );
    assert.strictEqual(read(libDir, "base/y.cc"), "y2\n");
    assert.strictEqual(read(libDir, "base/new.cc"), "n2\n");
    // Pruned files stay pruned even though upstream changed them
    assert.strictEqual(read(libDir, "base/OWNERS"), null);
    assert.strictEqual(
      read(libDir, "third_party/foo/src/docs/readme.md"),
      null
    );
    // Local-only files are never deleted
    assert.strictEqual(read(libDir, "base/local_only.cc"), "mine\n");
    assert.strictEqual(read(libDir, "NOTES.md"), "local notes\n");
    // Submodule pins moved coherently with the superproject
    assert.strictEqual(read(libDir, "third_party/foo/src/include/a.h"), "a2\n");
    assert.strictEqual(read(libDir, "third_party/foo/src/include/b.h"), null);
    assert.strictEqual(read(libDir, "third_party/foo/src/include/c.h"), "c2\n");
    assert.strictEqual(read(libDir, "third_party/whole/BUILD.gn"), "w2\n");
    assert.strictEqual(read(libDir, "third_party/whole/lib/w.c"), "wc1\n");
    // Release-branch-only files and new unfollowed gitlinks never appear
    assert.strictEqual(read(libDir, "VERSION"), null);
    assert.ok(!fs.existsSync(path.join(libDir, "base/third_party/newsub")));

    const config = JSON.parse(read(libDir, "sync-config.json")!);
    assert.strictEqual(config.commit, fx.shas.s3);
    assert.strictEqual(config.tag, "v2");
    assert.ok(config.submodules["third_party/whole"].fallbackUrls);

    const notes = read(libDir, "sync-pr-notes.md")!;
    assert.match(notes, /### Submodules \(2\)/);
    assert.match(
      notes,
      new RegExp(fx.shas.f1.slice(0, 12) + ".*" + fx.shas.f2.slice(0, 12))
    );
    assert.match(notes, /\*\*fallback\*\*/);
    assert.match(notes, /New upstream: `base\/third_party\/newsub`/);
    assert.match(notes, /`base\/third_party\/unused`/);
    assert.match(
      notes,
      /3 locally removed file\(s\) kept out \(2 changed or removed upstream\)/
    );
    assert.match(
      notes,
      /1 vendored file\(s\) excluded by \.syncignore were not updated: `third_party\/whole\/lib\/w\.c`/
    );

    await commitAll(mainDir, "sync v2");
  });

  it("re-syncing the same tag is a no-op", async () => {
    // Merge branches of earlier syncs are kept and names have one-second
    // resolution: occupy the names of the next 30 seconds to force a clash.
    const syncDir = path.join(mainDir, ".sync", "lib");
    const head = await git(syncDir, "rev-parse", "HEAD");
    const pad = (n: number) => String(n).padStart(2, "0");
    for (let s = 0; s < 30; s++) {
      const t = new Date(Date.now() + s * 1000);
      const id =
        `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}_` +
        `${pad(t.getHours())}-${pad(t.getMinutes())}-${pad(t.getSeconds())}`;
      await git(syncDir, "branch", "-f", `work_${id}`, head);
      await git(syncDir, "branch", "-f", `target_${id}`, head);
    }

    const before = read(libDir, "sync-config.json");
    const result = await runSync(mainDir, ["--tag", "v2"]);
    assert.ok(result.ok, result.output);
    assert.match(result.output, /Already up to date/);
    assert.strictEqual(read(libDir, "sync-config.json"), before);
    assert.strictEqual(await git(mainDir, "status", "--porcelain"), "");
  });
});

describe("sync (snapshot mode, newly followed scopes)", () => {
  let fx: Fixture;
  let mainDir: string;
  let libDir: string;

  before(async () => {
    const base = path.join(root, "newscope");
    fs.mkdirSync(base);
    fx = await createFixture(base);
    mainDir = path.join(base, "main");
    libDir = path.join(mainDir, "deps", "lib");
    await createMainRepo(mainDir, {
      repo: url(fx.superDir),
      branch: "main",
      sparsePaths: ["base"],
      fetchMode: "snapshot",
      keepLocalDeletions: true,
      tag: "",
      lastSync: "",
    });
    assert.ok((await runSync(mainDir, ["--tag", "v1"])).ok);
    await commitAll(mainDir, "vendor v1");
  });

  it("imports a submodule and a sparse path added to the config in full", async () => {
    const configPath = path.join(libDir, "sync-config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config.sparsePaths = ["base", "LICENSE"];
    config.submodules = { "third_party/foo/src": {} };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    await commitAll(mainDir, "follow foo and LICENSE");

    // Same tag: the new scopes must still be imported, not seen as pruned
    const result = await runSync(mainDir, ["--tag", "v1"]);
    assert.ok(result.ok, result.output);
    assert.strictEqual(read(libDir, "LICENSE"), "L0\n");
    assert.strictEqual(read(libDir, "third_party/foo/src/include/a.h"), "a1\n");
    assert.strictEqual(read(libDir, "third_party/foo/src/include/b.h"), "b1\n");
    assert.strictEqual(
      read(libDir, "third_party/foo/src/docs/readme.md"),
      "r1\n"
    );
    assert.match(
      read(libDir, "sync-pr-notes.md")!,
      /Newly followed, imported in full: `LICENSE`, `third_party\/foo\/src`/
    );
    await commitAll(mainDir, "import foo");

    // Next tag: the submodule now moves like any followed content
    const roll = await runSync(mainDir, ["--tag", "v2"]);
    assert.ok(roll.ok, roll.output);
    assert.strictEqual(read(libDir, "third_party/foo/src/include/a.h"), "a2\n");
    assert.strictEqual(read(libDir, "third_party/foo/src/include/b.h"), null);
    assert.doesNotMatch(read(libDir, "sync-pr-notes.md")!, /Newly followed/);
    await commitAll(mainDir, "sync v2");
  });

  it("fails clearly when a followed path is not a gitlink", async () => {
    const configPath = path.join(libDir, "sync-config.json");
    const original = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(original);
    config.submodules = { "third_party/foo/src": {}, "base/y.cc": {} };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    await commitAll(mainDir, "bad submodule");

    const result = await runSync(mainDir, ["--tag", "v2"]);
    assert.ok(!result.ok, "expected the sync to fail");
    assert.match(result.output, /'base\/y\.cc' is not a gitlink at target/);

    fs.writeFileSync(configPath, original);
    await commitAll(mainDir, "restore config");
  });

  it("replaces the snapshot repo when switching back to history mode", async () => {
    const configPath = path.join(libDir, "sync-config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    delete config.fetchMode;
    delete config.keepLocalDeletions;
    delete config.submodules;
    config.sparsePaths = ["base"];
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    await commitAll(mainDir, "back to history mode");

    const result = await runSync(mainDir, ["--tag", "v2"]);
    assert.ok(result.ok, result.output);
    const syncDir = path.join(mainDir, ".sync", "lib");
    assert.strictEqual(
      await git(syncDir, "rev-parse", "--is-shallow-repository"),
      "false"
    );
    assert.strictEqual(
      await git(syncDir, "config", "--get", "remote.origin.promisor"),
      "true"
    );
  });
});

describe("sync (snapshot mode, conflicts and --continue)", () => {
  it("pauses on a conflict and finishes with --continue", async () => {
    const base = path.join(root, "conflict");
    fs.mkdirSync(base);
    const fx = await createFixture(base);
    const mainDir = path.join(base, "main");
    const libDir = path.join(mainDir, "deps", "lib");
    await createMainRepo(mainDir, {
      repo: url(fx.superDir),
      branch: "main",
      sparsePaths: ["base"],
      fetchMode: "snapshot",
      submodules: { "third_party/foo/src": {} },
      keepLocalDeletions: true,
      tag: "",
      lastSync: "",
    });
    assert.ok((await runSync(mainDir, ["--tag", "v1"])).ok);
    await commitAll(mainDir, "vendor v1");

    // Conflicting edits: superproject line1 and submodule a.h
    write(libDir, {
      "base/x.cc": lines("LINE1-local", "line2", "line3", "line4", "line5"),
      "third_party/foo/src/include/a.h": "a-local\n",
    });
    await commitAll(mainDir, "conflicting fork changes");

    const paused = await runSync(mainDir, ["--tag", "v2"]);
    assert.ok(paused.ok, paused.output);
    const syncDir = path.join(mainDir, ".sync", "lib");
    assert.ok(fs.existsSync(path.join(syncDir, ".sync-checkpoint.json")));
    const conflicts = (
      await git(syncDir, "diff", "--name-only", "--diff-filter=U")
    )
      .split("\n")
      .sort();
    assert.deepStrictEqual(conflicts, [
      "base/x.cc",
      "third_party/foo/src/include/a.h",
    ]);

    // Resolve by hand in the sync repo, then continue
    write(syncDir, {
      "base/x.cc": lines("LINE1-merged", "line2", "line3", "line4", "line5"),
      "third_party/foo/src/include/a.h": "a-merged\n",
    });
    await git(syncDir, "add", "base/x.cc", "third_party/foo/src/include/a.h");

    const resumed = await runSync(mainDir, ["--continue"]);
    assert.ok(resumed.ok, resumed.output);
    assert.strictEqual(
      read(libDir, "base/x.cc")?.split("\n")[0],
      "LINE1-merged"
    );
    assert.strictEqual(
      read(libDir, "third_party/foo/src/include/a.h"),
      "a-merged\n"
    );
    assert.strictEqual(read(libDir, "third_party/foo/src/include/c.h"), "c2\n");
    assert.match(read(libDir, "sync-pr-notes.md")!, /### Submodules \(1\)/);
    assert.ok(!fs.existsSync(path.join(syncDir, ".sync-checkpoint.json")));
  });
});

describe("sync (snapshot mode, --abort and subDir)", () => {
  it("--abort discards a paused snapshot sync", async () => {
    const base = path.join(root, "abort");
    fs.mkdirSync(base);
    const fx = await createFixture(base);
    const mainDir = path.join(base, "main");
    const libDir = path.join(mainDir, "deps", "lib");
    await createMainRepo(mainDir, {
      repo: url(fx.superDir),
      branch: "main",
      sparsePaths: ["base"],
      fetchMode: "snapshot",
      keepLocalDeletions: true,
      tag: "",
      lastSync: "",
    });
    assert.ok((await runSync(mainDir, ["--tag", "v1"])).ok);
    write(libDir, {
      "base/x.cc": lines("LINE1-local", "line2", "line3", "line4", "line5"),
    });
    await commitAll(mainDir, "conflicting fork change");

    assert.ok((await runSync(mainDir, ["--tag", "v2"])).ok);
    const checkpoint = path.join(
      mainDir,
      ".sync",
      "lib",
      ".sync-checkpoint.json"
    );
    assert.ok(fs.existsSync(checkpoint));

    const aborted = await runSync(mainDir, ["--abort"]);
    assert.ok(aborted.ok, aborted.output);
    assert.ok(!fs.existsSync(checkpoint));
    assert.strictEqual(await git(mainDir, "status", "--porcelain"), "");
    assert.strictEqual(
      read(libDir, "base/x.cc")?.split("\n")[0],
      "LINE1-local"
    );
    assert.match(
      (await runSync(mainDir, ["--status"])).output,
      /No sync in progress/
    );
  });

  it("syncs a prefix-stripped subDir with keepLocalDeletions", async () => {
    const base = path.join(root, "subdir");
    fs.mkdirSync(base);
    const fx = await createFixture(base);
    const mainDir = path.join(base, "main");
    const libDir = path.join(mainDir, "deps", "lib");
    await createMainRepo(mainDir, {
      repo: url(fx.superDir),
      branch: "main",
      subDir: "base",
      fetchMode: "snapshot",
      keepLocalDeletions: true,
      tag: "",
      lastSync: "",
    });
    const first = await runSync(mainDir, ["--tag", "v1"]);
    assert.ok(first.ok, first.output);
    assert.strictEqual(read(libDir, "y.cc"), "y0\n");
    assert.strictEqual(read(libDir, "OWNERS"), "o0\n");
    assert.ok(!fs.existsSync(path.join(libDir, "third_party")));
    await commitAll(mainDir, "vendor v1");

    write(libDir, {
      "x.cc": lines("line1", "line2", "line3", "line4", "LINE5-local"),
      OWNERS: null,
      "local.cc": "mine\n",
    });
    await commitAll(mainDir, "fork changes");

    const roll = await runSync(mainDir, ["--tag", "v2"]);
    assert.ok(roll.ok, roll.output);
    assert.strictEqual(
      read(libDir, "x.cc"),
      lines("LINE1-upstream", "line2", "line3", "line4", "LINE5-local")
    );
    assert.strictEqual(read(libDir, "y.cc"), "y2\n");
    assert.strictEqual(read(libDir, "new.cc"), "n2\n");
    assert.strictEqual(read(libDir, "OWNERS"), null);
    assert.strictEqual(read(libDir, "local.cc"), "mine\n");
    assert.ok(!fs.existsSync(path.join(libDir, "base")));
  });
});

describe("sync (config validation)", () => {
  async function expectConfigError(
    name: string,
    config: Record<string, unknown>,
    pattern: RegExp
  ): Promise<void> {
    const mainDir = path.join(root, `config-${name}`);
    await createMainRepo(mainDir, {
      repo: "https://example.com/org/repo",
      branch: "main",
      tag: "",
      lastSync: "",
      ...config,
    });
    const result = await runSync(mainDir, []);
    assert.ok(!result.ok, "expected the sync to fail");
    assert.match(result.output, pattern);
  }

  it("rejects submodules without snapshot mode", () =>
    expectConfigError(
      "submodules",
      { submodules: { "a/b": {} } },
      /'submodules' requires "fetchMode": "snapshot"/
    ));

  it("rejects keepLocalDeletions without snapshot mode", () =>
    expectConfigError(
      "keep",
      { keepLocalDeletions: true },
      /'keepLocalDeletions' requires "fetchMode": "snapshot"/
    ));

  it("rejects an unknown fetchMode", () =>
    expectConfigError("mode", { fetchMode: "shallow" }, /Invalid 'fetchMode'/));

  it("rejects overlapping submodule paths", () =>
    expectConfigError(
      "overlap",
      { fetchMode: "snapshot", submodules: { a: {}, "a/b": {} } },
      /overlaps/
    ));

  it("rejects bad fallbackUrls", () =>
    expectConfigError(
      "fallback",
      { fetchMode: "snapshot", submodules: { a: { fallbackUrls: "x" } } },
      /Invalid 'fallbackUrls'/
    ));

  async function expectManifestError(
    name: string,
    aiMerge: Record<string, unknown>,
    pattern: RegExp
  ): Promise<void> {
    const mainDir = path.join(root, `manifest-${name}`);
    await createMainRepo(
      mainDir,
      {
        repo: "https://example.com/org/repo",
        branch: "main",
        tag: "",
        lastSync: "",
      },
      { aiMerge }
    );
    const result = await runSync(mainDir, []);
    assert.ok(!result.ok, "expected the sync to fail");
    assert.match(result.output, pattern);
  }

  it("rejects model IDs with shell characters", () =>
    expectManifestError(
      "model",
      { provider: "copilot", model: ["auto", "gpt; rm -rf /"] },
      /Invalid 'model'/
    ));

  it("rejects an unknown provider", () =>
    expectManifestError(
      "provider",
      { provider: "openai" },
      /Invalid 'provider'/
    ));

  it("rejects an unknown reasoning effort", () =>
    expectManifestError(
      "effort",
      { reasoningEffort: "extreme" },
      /Invalid 'reasoningEffort'/
    ));
});

describe("sync (history mode)", () => {
  it("fetches a tag that is not reachable from fetched branches", async () => {
    const base = path.join(root, "history");
    fs.mkdirSync(base);
    const upstream = path.join(base, "up.git");
    await initServer(upstream);
    await commit(upstream, "A", { "src/a.txt": "a1\n" });
    const mainDir = path.join(base, "main");
    const libDir = path.join(mainDir, "deps", "lib");
    await createMainRepo(mainDir, {
      repo: url(upstream),
      branch: "main",
      tag: "",
      lastSync: "",
    });
    assert.ok((await runSync(mainDir, [])).ok);
    await commitAll(mainDir, "vendor A");

    // A release commit only reachable from refs/branch-heads/*, tagged r2
    await git(upstream, "checkout", "--quiet", "-b", "tmp");
    await commit(upstream, "R2", { "src/a.txt": "a2\n" });
    await git(upstream, "tag", "r2");
    await git(upstream, "update-ref", "refs/branch-heads/2", "HEAD");
    await git(upstream, "checkout", "--quiet", "main");
    await git(upstream, "branch", "-D", "tmp");

    const result = await runSync(mainDir, ["--tag", "r2"]);
    assert.ok(result.ok, result.output);
    assert.strictEqual(read(libDir, "src/a.txt"), "a2\n");
    assert.strictEqual(JSON.parse(read(libDir, "sync-config.json")!).tag, "r2");
    await commitAll(mainDir, "sync r2");

    // A commit only reachable from refs/branch-heads/*, by full SHA
    await git(upstream, "checkout", "--quiet", "-b", "tmp", "r2");
    const r3 = await commit(upstream, "R3", { "src/a.txt": "a3\n" });
    await git(upstream, "update-ref", "refs/branch-heads/3", "HEAD");
    await git(upstream, "checkout", "--quiet", "main");
    await git(upstream, "branch", "-D", "tmp");

    const byCommit = await runSync(mainDir, ["--commit", r3]);
    assert.ok(byCommit.ok, byCommit.output);
    assert.strictEqual(read(libDir, "src/a.txt"), "a3\n");
  });
});
