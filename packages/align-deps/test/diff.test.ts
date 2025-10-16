import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { isSubset } from "../src/diff.ts";

describe("isSubset()", () => {
  it("returns true if the current version is a subset of the target version", () => {
    ok(isSubset("1.0.0", "1.0.0"));
    ok(isSubset("^1.0.0", "^1.0.0"));
    ok(isSubset("~1.0.0", "~1.0.0"));
    ok(isSubset("1.0.0 - 2.0.0", "1.0.0 - 2.0.0"));
    ok(isSubset(">=1.0.0", ">=1.0.0"));
    ok(isSubset("<=2.0.0", "<=2.0.0"));
    ok(isSubset(">1.0.0", ">1.0.0"));
    ok(isSubset("<2.0.0", "<2.0.0"));
    ok(isSubset("1.x", "1.x"));
    ok(isSubset("1.*", "1.*"));
    ok(isSubset("*", "*"));
    ok(isSubset("latest", "latest"));

    ok(isSubset("1.0.0", "^1.0.0"));
    ok(isSubset("1.5.0", "^1.0.0"));
    ok(isSubset("1.0.0", "~1.0.0"));
    ok(isSubset("1.0.5", "~1.0.0"));
    ok(isSubset("1.5.0", "1.0.0 - 2.0.0"));
    ok(isSubset("2.0.0", "1.0.0 - 2.0.0"));
    ok(isSubset(">=1.5.0", ">=1.0.0"));
    ok(isSubset("<=1.5.0", "<=2.0.0"));
    ok(isSubset(">1.5.0", ">1.0.0"));
    ok(isSubset("<1.5.0", "<2.0.0"));
    ok(isSubset("1.x", "1.0.0 - 2.0.0"));
    ok(isSubset("1.*", "1.0.0 - 2.0.0"));
    ok(isSubset("1.x", ">=1.0.0"));
    ok(isSubset("1.*", ">=1.0.0"));
    ok(isSubset("1.x", "<=2.0.0"));
    ok(isSubset("1.*", "<=2.0.0"));

    ok(!isSubset("*", ">=1.0.0"));
    ok(!isSubset("*", "<=2.0.0"));
    ok(!isSubset("*", ">=1.0.0 <=2.0.0"));
  });

  it("handles unknown protocols gracefully", () => {
    ok(isSubset("file:../project-a", "file:../project-a"));
    ok(!isSubset("file:../project-a", "file:../project-a2"));

    ok(
      isSubset(
        "git+ssh://github.com/user/repo.git",
        "git+ssh://github.com/user/repo.git"
      )
    );
    ok(
      !isSubset(
        "git+ssh://github.com/user/repo.git",
        "git+ssh://github.com/user/other-repo.git"
      )
    );

    ok(isSubset("github:user/repo", "github:user/repo"));
    ok(!isSubset("github:user/repo", "github:user/other-repo"));

    ok(isSubset("catalog:", "catalog:"));
    ok(!isSubset("catalog:", "catalog:name"));

    ok(!isSubset("1.0.0", "catalog:"));
    ok(!isSubset("catalog:", "1.0.0"));
  });
});
