import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesContent } from "../src/files.ts";
import { added, diffAdding, makeRun } from "./helpers.ts";

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
    equal(check({ ...config, forbidden: ["\\S"] }, [a], "").pass, true);
  });
});
