import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesContent, matchesFiles } from "../src/files.ts";
import type { AgentChangedFile } from "../src/types.ts";
import { added, diffAdding, makeRun } from "./helpers.ts";

describe("matchesFiles()", () => {
  const files: AgentChangedFile[] = [
    added("packages/node-pkg/src/a.ts", ""),
    { path: "packages/node-pkg/src/b.ts", status: "modified", content: "" },
    { path: "packages/node-pkg/src/c.ts", status: "deleted" },
  ];

  function check(
    config: Parameters<typeof matchesFiles>[1]["config"],
    f = files
  ) {
    return matchesFiles(makeRun({ files: f }), { config });
  }

  it("passes with an empty config", () => {
    const result = check({});
    equal(result.pass, true);
    equal(
      result.reason,
      "Changed files: packages/node-pkg/src/a.ts, packages/node-pkg/src/b.ts, packages/node-pkg/src/c.ts"
    );
  });

  it("reports when no files changed", () => {
    equal(check({}, []).reason, "Changed files: (none)");
  });

  it("fails for files not allowed", () => {
    const result = check({ allowed: ["/a\\.ts$", "/b\\.ts$"] });
    equal(result.pass, false);
    equal(result.reason, "File not allowed: packages/node-pkg/src/c.ts");
  });

  it("fails for forbidden files", () => {
    const result = check({ forbidden: ["/[ab]\\.ts$"] });
    equal(result.pass, false);
    equal(
      result.reason,
      [
        "File forbidden by //[ab]\\.ts$/: packages/node-pkg/src/a.ts",
        "File forbidden by //[ab]\\.ts$/: packages/node-pkg/src/b.ts",
      ].join("\n")
    );
  });

  it("fails for required files that did not change", () => {
    const result = check({ required: ["/a\\.ts$", "/d\\.ts$"] });
    equal(result.pass, false);
    equal(result.reason, "No file matched //d\\.ts$/");
  });

  it("only considers files with the configured statuses", () => {
    equal(
      check({ status: ["deleted"], forbidden: ["/[ab]\\.ts$"] }).pass,
      true
    );
    equal(check({ status: ["added"], required: ["/b\\.ts$"] }).pass, false);
  });

  describe("with `singlePackage`", () => {
    it("passes if files of one package changed", () => {
      const result = check({ singlePackage: true }, [
        added("README.md", ""),
        added("packages/node-pkg/src/a.ts", ""),
        // Fixture manifests do not make a separate package
        added("packages/node-pkg/test/__fixtures__/nested/index.js", ""),
      ]);
      equal(result.pass, true);
    });

    it("fails if files of multiple packages changed", () => {
      const result = check({ singlePackage: true }, [
        added("packages/node-pkg/src/a.ts", ""),
        added("packages/jest-field/src/a.ts", ""),
      ]);
      equal(result.pass, false);
      equal(
        result.reason,
        "Changed multiple packages: packages/node-pkg, packages/jest-field"
      );
    });
  });
});

describe("matchesContent()", () => {
  const a = added("src/a.ts", 'import { a } from "a";\nconst x = 1;');
  const b = added("src/b.ts", 'import { b } from "b";');

  function check(
    config: Parameters<typeof matchesContent>[1]["config"],
    files = [a, b],
    diff = ""
  ) {
    return matchesContent(makeRun({ files, diff }), { config });
  }

  it("fails if no changed file matches", () => {
    const result = check({ files: "\\.md$" });
    equal(result.pass, false);
    equal(result.reason, "No changed file matched /\\.md$/");
  });

  it("ignores deleted files", () => {
    const result = check({ files: "\\.ts$" }, [
      { path: "src/c.ts", status: "deleted" },
    ]);
    equal(result.pass, false);
  });

  it("requires patterns in every file by default", () => {
    const result = check({ files: "\\.ts$", required: ["^import"] });
    equal(result.pass, true);
    equal(result.reason, "Checked src/a.ts, src/b.ts");

    const failed = check({ files: "\\.ts$", required: ["^const"] });
    equal(failed.pass, false);
    equal(failed.reason, "src/b.ts: missing /^const/");
  });

  it("requires patterns in any file with `match: any`", () => {
    equal(
      check({ files: "\\.ts$", required: ["^const"], match: "any" }).pass,
      true
    );

    const failed = check({ files: "\\.ts$", required: ["^let"], match: "any" });
    equal(failed.pass, false);
    equal(failed.reason, "No matching file contains /^let/");
  });

  it("fails for forbidden patterns", () => {
    const result = check({ files: "\\.ts$", forbidden: ['from "[ab]"'] });
    equal(result.pass, false);
    equal(
      result.reason,
      'src/a.ts: contains /from "[ab]"/\nsrc/b.ts: contains /from "[ab]"/'
    );
  });

  it("only checks added lines with `addedLinesOnly`", () => {
    const config = {
      files: "\\.ts$",
      forbidden: ["^import"],
      addedLinesOnly: true,
    };
    equal(check(config, [a], diffAdding(a, [2])).pass, true);
    equal(check(config, [a], diffAdding(a, [1])).pass, false);
    // Files without added lines are still checked, but are empty
    equal(check({ ...config, required: ["\\S"] }, [a], "").pass, false);
  });
});
