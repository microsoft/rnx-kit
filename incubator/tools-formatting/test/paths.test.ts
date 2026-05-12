import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { shortenPath } from "../src/paths.ts";

describe("shortenPath", () => {
  it("shortens a long unix path to 3 segments", () => {
    equal(
      shortenPath(
        "/Users/someuser/dev/rnx-kit/packages/metro-resolver-symlinks/src/metro-resolver.ts"
      ),
      ".../metro-resolver-symlinks/src/metro-resolver.ts"
    );
  });

  it("keeps 4 segments when the boundary falls on a src dir", () => {
    equal(
      shortenPath(
        "/Users/someuser/dev/rnx-kit/packages/my-package/src/utils/helpers.ts"
      ),
      ".../my-package/src/utils/helpers.ts"
    );
  });

  it("detects lib as a src dir", () => {
    equal(
      shortenPath("/a/b/c/d/lib/utils/index.ts"),
      ".../d/lib/utils/index.ts"
    );
  });

  it("detects dist as a src dir", () => {
    equal(
      shortenPath("/a/b/c/d/dist/utils/index.js"),
      ".../d/dist/utils/index.js"
    );
  });

  it("detects bin as a src dir", () => {
    equal(shortenPath("/a/b/c/d/bin/utils/cli.js"), ".../d/bin/utils/cli.js");
  });

  it("returns path unchanged when it has fewer segments than requested", () => {
    equal(shortenPath("foo/bar.ts"), "foo/bar.ts");
  });

  it("does not shorten when result would be longer than original", () => {
    // /a/b/c.ts is short enough that prepending "..." would not save space
    equal(shortenPath("/a/b/c.ts"), "/a/b/c.ts");
  });

  it("returns path unchanged when separators are fewer than segments", () => {
    equal(shortenPath("a/b/c.ts"), "a/b/c.ts");
  });

  it("returns empty string for empty input", () => {
    equal(shortenPath(""), "");
  });

  it("returns bare filename unchanged", () => {
    equal(shortenPath("file.ts"), "file.ts");
  });

  it("handles windows-style backslash separators", () => {
    equal(
      shortenPath("C:\\Users\\me\\dev\\packages\\my-pkg\\src\\index.ts"),
      "...\\my-pkg\\src\\index.ts"
    );
  });

  it("respects custom segment count", () => {
    equal(shortenPath("/a/b/c/d/e.ts", 2), ".../d/e.ts");
  });

  it("custom segments=1 returns just the filename with ellipsis", () => {
    equal(shortenPath("/a/b/c/d/e.ts", 1), ".../e.ts");
  });

  it("src dir check still applies with custom segment count", () => {
    equal(shortenPath("/a/b/c/src/e.ts", 2), ".../c/src/e.ts");
  });

  it("does not trigger src dir check for non-boundary segments", () => {
    equal(shortenPath("/a/b/c/d/src/file.ts"), ".../d/src/file.ts");
  });

  it("handles trailing separator", () => {
    // trailing / creates an empty segment, so 3 segments = empty + "e" + "d"
    equal(shortenPath("/a/b/c/d/e/"), ".../d/e/");
  });

  it("src dir check only extends by one extra segment", () => {
    // Even if the 4th segment is also a src dir, we only get one extra
    equal(
      shortenPath("/longer/lib/src/utils/helpers.ts"),
      ".../lib/src/utils/helpers.ts"
    );
  });

  it("does not shorten when src dir extension would exceed original length", () => {
    // /a/lib/src/utils/helpers.ts — the src dir extension would place
    // the cut at index 2, inside the ellipsis guard, so it returns unchanged
    equal(
      shortenPath("/a/lib/src/utils/helpers.ts"),
      "/a/lib/src/utils/helpers.ts"
    );
  });
});
