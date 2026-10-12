import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { usesPackageTestRunner } from "../src/tests.ts";
import type { AgentChangedFile } from "../src/types.ts";
import { added, diffAdding, makeRun } from "./helpers.ts";

const NODE_TEST = [
  'import { equal } from "node:assert/strict";',
  'import { it } from "node:test";',
  "",
  'it("works", () => equal(1, 1));',
].join("\n");

const JEST_TEST = 'it("works", () => expect(1).toBe(1));';

function check(files: AgentChangedFile[], diff?: string) {
  return usesPackageTestRunner(
    makeRun({ files, diff: diff ?? files.map((f) => diffAdding(f)).join("") })
  );
}

describe("usesPackageTestRunner()", () => {
  it("fails if no test files changed", () => {
    const result = check([
      added("packages/node-pkg/src/index.ts", ""),
      added("packages/node-pkg/test/helpers.ts", ""),
      { path: "packages/node-pkg/test/a.test.ts", status: "deleted" },
    ]);
    equal(result.pass, false);
    equal(result.reason, "No test files changed");
  });

  it("recognizes test files", () => {
    for (const path of [
      "test/a.test.ts",
      "packages/node-pkg/test/a.test.js",
      "packages/node-pkg/test/sub/a.test.mts",
      "packages/node-pkg/test/a.test.cjs",
      "packages/node-pkg/test/a.test.tsx",
    ]) {
      equal(check([added(path, JEST_TEST)]).pass, false, path);
    }
  });

  describe("in Node.js test runner packages", () => {
    it("passes for tests using node:test and node:assert/strict", () => {
      const result = check([
        added("packages/node-pkg/test/a.test.ts", NODE_TEST),
      ]);
      equal(result.pass, true);
      equal(result.reason, "Checked packages/node-pkg/test/a.test.ts");
    });

    it("fails if imports are missing", () => {
      const content = 'it("works", () => {});';
      const result = check([
        added("packages/node-pkg/test/a.test.ts", content),
      ]);
      equal(result.pass, false);
      equal(
        result.reason,
        "packages/node-pkg/test/a.test.ts: missing imports from 'node:test' and 'node:assert/strict'"
      );
    });

    it("fails for added Jest APIs", () => {
      for (const api of [
        "expect(1).toBe(1);",
        "jest.fn();",
        'import { jest } from "@jest/globals";',
      ]) {
        const file = added(
          "packages/node-pkg/test/a.test.ts",
          `${NODE_TEST}\n${api}`
        );
        const result = check([file]);
        equal(result.pass, false, api);
        equal(
          result.reason,
          "packages/node-pkg/test/a.test.ts: uses Jest in a Node.js test runner package"
        );
      }
    });

    it("ignores Jest APIs in unchanged lines", () => {
      const file: AgentChangedFile = {
        path: "packages/node-pkg/test/a.test.ts",
        status: "modified",
        content: `${NODE_TEST}\nexpect(1);`,
      };
      equal(check([file], diffAdding(file, [4])).pass, true);
    });

    it("uses the owning workspace package rather than fixture manifests", () => {
      const path = "packages/node-pkg/test/__fixtures__/nested/test/a.test.ts";
      equal(check([added(path, NODE_TEST)]).pass, true);
      equal(check([added(path, JEST_TEST)]).pass, false);
    });

    it("treats files outside packages as belonging to the root", () => {
      equal(check([added("test/a.test.ts", NODE_TEST)]).pass, true);
    });
  });

  describe("in Jest packages", () => {
    it("passes for Jest tests", () => {
      for (const pkg of ["jest-field", "jest-config"]) {
        const result = check([
          added(`packages/${pkg}/test/a.test.ts`, JEST_TEST),
        ]);
        equal(result.pass, true, pkg);
      }
    });

    it("fails for added 'node:test' or 'node:assert' imports", () => {
      const result = check([
        added("packages/jest-field/test/a.test.ts", NODE_TEST),
      ]);
      equal(result.pass, false);
      equal(
        result.reason,
        "packages/jest-field/test/a.test.ts: uses 'node:test' in a Jest package"
      );
    });

    it("ignores node:test imports in unchanged lines", () => {
      const file: AgentChangedFile = {
        path: "packages/jest-config/test/a.test.ts",
        status: "modified",
        content: NODE_TEST,
      };
      equal(check([file], diffAdding(file, [4])).pass, true);
    });
  });

  it("reports failures for every file", () => {
    const result = check([
      added("packages/node-pkg/test/a.test.ts", JEST_TEST),
      added("packages/jest-field/test/a.test.ts", NODE_TEST),
    ]);
    equal(result.pass, false);
    equal(
      result.reason,
      [
        "packages/node-pkg/test/a.test.ts: missing imports from 'node:test' and 'node:assert/strict'",
        "packages/node-pkg/test/a.test.ts: uses Jest in a Node.js test runner package",
        "packages/jest-field/test/a.test.ts: uses 'node:test' in a Jest package",
      ].join("\n")
    );
  });
});
