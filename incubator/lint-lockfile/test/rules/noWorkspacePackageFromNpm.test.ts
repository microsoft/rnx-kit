import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { noWorkspacePackageFromNpmRule } from "../../src/rules/noWorkspacePackageFromNpm.ts";

describe("rules:useWorkspacePackage()", () => {
  const lockfile = {
    "@ampproject/remapping@npm:^2.2.0": {
      package: "@ampproject/remapping",
      specifiers: ["npm:^2.2.0"],
      resolution: "2.2.0",
    },
    "@babel/code-frame@npm:^7.0.0, @babel/code-frame@npm:^7.12.13": {
      package: "@babel/code-frame",
      specifiers: ["npm:^7.0.0", "npm:^7.12.13"],
      resolution: "7.27.1",
    },
    "@babel/code-frame@npm:^7.24.7, @babel/code-frame@npm:^7.25.9": {
      package: "@babel/code-frame",
      specifiers: ["npm:^7.24.7", "npm:^7.25.9"],
      resolution: "7.27.4",
    },
    "@rnx-kit/lint-lockfile@workspace:*": {
      package: "@rnx-kit/lint-lockfile",
      specifiers: ["workspace:*"],
      resolution: "0.0.0-use.local",
    },
    "@rnx-kit/lint-lockfile@npm:1.0.0": {
      package: "@rnx-kit/lint-lockfile",
      specifiers: ["npm:1.0.0"],
      resolution: "1.0.0",
    },
  };

  const noWorkspacePackageFromNpm = noWorkspacePackageFromNpmRule();

  it("flags packages that should have resolved locally", () => {
    const packages = ["@rnx-kit/lint-lockfile"];

    const cases: [keyof typeof lockfile, number][] = [
      ["@ampproject/remapping@npm:^2.2.0", 0],
      ["@babel/code-frame@npm:^7.0.0, @babel/code-frame@npm:^7.12.13", 0],
      ["@babel/code-frame@npm:^7.24.7, @babel/code-frame@npm:^7.25.9", 0],
      ["@rnx-kit/lint-lockfile@npm:1.0.0", 1],
      ["@rnx-kit/lint-lockfile@workspace:*", 0],
    ];

    for (const [key, maxErrors] of cases) {
      let errors = 0;
      const context = { packages, report: () => ++errors };
      noWorkspacePackageFromNpm(context, key, lockfile[key]);
      equal(
        errors,
        maxErrors,
        `Expected '${key}' to produce ${maxErrors} error(s)`
      );
    }
  });
});
