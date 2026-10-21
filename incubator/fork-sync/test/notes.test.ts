// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "node:assert";
import { describe, it } from "node:test";
import {
  compareUrl,
  formatCommitTable,
  formatSubmoduleSection,
  type SubmoduleReport,
} from "../src/modules/notes.ts";

const changes = { modified: 1, added: 2, deleted: 3 };

function report(overrides: Partial<SubmoduleReport> = {}): SubmoduleReport {
  return {
    path: "third_party/foo/src",
    url: "https://chromium.googlesource.com/external/foo",
    servedUrl: "https://chromium.googlesource.com/external/foo",
    baseSha: "a".repeat(40),
    targetSha: "b".repeat(40),
    changes,
    ...overrides,
  };
}

describe("formatCommitTable", () => {
  it("reports an empty range", () => {
    assert.deepStrictEqual(formatCommitTable([]), [
      "No commits found in range.",
    ]);
  });

  it("caps the table and reports the remainder", () => {
    const commits = Array.from({ length: 5 }, (_, i) => ({
      hash: `${i}`.repeat(40),
      author: "A",
      subject: `s${i}`,
    }));
    const lines = formatCommitTable(commits, 2);
    assert.strictEqual(lines.length, 2 + 2 + 2);
    assert.strictEqual(lines.at(-1), "… and 3 more.");
  });

  it("escapes pipes in cells", () => {
    const lines = formatCommitTable([
      { hash: "f".repeat(40), author: "a|b", subject: "x | y" },
    ]);
    assert.strictEqual(lines[2], "| `ffffffff` | a\\|b | x \\| y |");
  });
});

describe("compareUrl", () => {
  it("builds GitHub compare links", () => {
    assert.strictEqual(
      compareUrl("https://github.com/google/perfetto.git", "a", "b"),
      "https://github.com/google/perfetto/compare/a...b"
    );
  });

  it("builds Gitiles log links", () => {
    assert.strictEqual(
      compareUrl("https://chromium.googlesource.com/chromium/src", "a", "b"),
      "https://chromium.googlesource.com/chromium/src/+log/a..b"
    );
  });

  it("returns empty for unknown hosts, file URLs, or no base", () => {
    assert.strictEqual(compareUrl("https://example.com/x", "a", "b"), "");
    assert.strictEqual(compareUrl("file:///c:/x", "a", "b"), "");
    assert.strictEqual(compareUrl("https://github.com/o/r", "", "b"), "");
    assert.strictEqual(compareUrl("not a url", "a", "b"), "");
  });
});

describe("formatSubmoduleSection", () => {
  it("lists pin moves with links and change counts", () => {
    const text = formatSubmoduleSection([report()], {
      base: [],
      target: [],
    }).join("\n");
    assert.match(text, /### Submodules \(1\)/);
    assert.match(
      text,
      /\[`aaaaaaaaaaaa` → `bbbbbbbbbbbb`\]\(https:\/\/chromium\.googlesource\.com\/external\/foo\/\+log\/a{40}\.\.b{40}\)/
    );
    assert.match(text, /1 modified, 2 added, 3 deleted/);
    assert.doesNotMatch(text, /Gitlinks/);
  });

  it("marks unchanged pins and fallback sources", () => {
    const text = formatSubmoduleSection(
      [
        report({
          baseSha: "c".repeat(40),
          targetSha: "c".repeat(40),
          servedUrl: "https://github.com/foo/foo",
        }),
      ],
      { base: [], target: [] }
    ).join("\n");
    assert.match(text, /`cccccccccccc` \(unchanged\)/);
    assert.match(text, /https:\/\/github\.com\/foo\/foo \(\*\*fallback\*\*/);
  });

  it("flags a submodule URL change between base and target", () => {
    const text = formatSubmoduleSection(
      [report({ baseUrl: "https://old.example.com/foo" })],
      { base: [], target: [] }
    ).join("\n");
    assert.match(
      text,
      /\*\*URL changed\*\* from https:\/\/old\.example\.com\/foo/
    );
  });

  it("caps the list of unfollowed gitlinks", () => {
    const many = Array.from({ length: 60 }, (_, i) => `g/${i}`);
    const text = formatSubmoduleSection([], { base: many, target: many }).join(
      "\n"
    );
    assert.match(text, /- … and 10 more/);
  });

  it("reports gitlink drift", () => {
    const text = formatSubmoduleSection([], {
      base: ["a/old", "a/kept"],
      target: ["a/kept", "a/new"],
    }).join("\n");
    assert.match(text, /New upstream: `a\/new`/);
    assert.match(text, /Removed upstream: `a\/old`/);
    assert.match(text, /- `a\/kept`/);
  });

  it("does not call gitlinks new on a first sync", () => {
    const text = formatSubmoduleSection(
      [],
      { base: [], target: ["a/x"] },
      false
    ).join("\n");
    assert.doesNotMatch(text, /New upstream/);
    assert.match(text, /- `a\/x`/);
  });
});
