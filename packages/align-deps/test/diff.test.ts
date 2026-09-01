import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { isSubset, stringify } from "../src/diff.ts";
import type { Changes } from "../src/types.ts";

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

describe("stringify()", () => {
  const changes: Partial<Changes> = {
    dependencies: [
      {
        type: "added",
        dependency: "@react-native-community/netinfo",
        target: "^9.0.0",
      },
      {
        type: "changed",
        dependency: "react-native",
        target: "^0.70.0",
        current: "0.70.3",
      },
      { type: "removed", dependency: "old-package" },
    ],
  };

  it("does not add reasons when none are provided", () => {
    const output = stringify(changes, ["package.json"]);

    ok(!output.includes("required by"));
  });

  it("does not add reasons when 'reasons' is empty", () => {
    const output = stringify(changes, ["package.json"], {});

    ok(!output.includes("required by"));
  });

  it("adds reasons for added and changed dependencies", () => {
    const output = stringify(changes, ["package.json"], {
      "@react-native-community/netinfo": ["dutch"],
      "react-native": ["awesome-repo", "conan"],
    });

    ok(
      output.includes(
        `      ├── dependencies["@react-native-community/netinfo"]: dependency is missing, expected "^9.0.0"\n` +
          `      │     └── required by 'dutch'`
      )
    );
    ok(
      output.includes(
        `      ├── dependencies["react-native"]: found "0.70.3", expected "^0.70.0"\n` +
          `      │     └── required by 'awesome-repo', 'conan'`
      )
    );
  });

  it("does not add reasons for removed dependencies", () => {
    const output = stringify(changes, ["package.json"], {
      "old-package": ["some-package"],
    });

    equal(output.includes("required by"), false);
  });
});
