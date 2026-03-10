import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { buildConfig, formatResults } from "../src/index.ts";

describe("buildConfig", () => {
  it("uses default entry and test patterns when none provided", () => {
    const config = buildConfig({});
    deepEqual(config, {
      entry: [
        "src/index.ts",
        "test/**/*.test.{js,mjs,ts,tsx}",
      ],
    });
  });

  it("uses custom entry points", () => {
    const config = buildConfig({ entry: ["src/main.ts", "src/cli.ts"] });
    deepEqual(config.entry, [
      "src/main.ts",
      "src/cli.ts",
      "test/**/*.test.{js,mjs,ts,tsx}",
    ]);
  });

  it("uses custom test file patterns", () => {
    const config = buildConfig({ testFilePatterns: ["**/*.spec.ts"] });
    deepEqual(config.entry, ["src/index.ts", "**/*.spec.ts"]);
  });

  it("includes config files in entry", () => {
    const config = buildConfig({
      configFiles: ["jest.config.js", "babel.config.js"],
    });
    deepEqual(config.entry, [
      "src/index.ts",
      "test/**/*.test.{js,mjs,ts,tsx}",
      "jest.config.js",
      "babel.config.js",
    ]);
  });

  it("includes project patterns", () => {
    const config = buildConfig({ project: ["src/**/*.ts"] });
    deepEqual(config.project, ["src/**/*.ts"]);
  });

  it("does not include project key when no project patterns", () => {
    const config = buildConfig({});
    equal("project" in config, false);
  });

  it("includes ignoreDependencies", () => {
    const config = buildConfig({
      ignoreDependencies: ["lodash", /^@types\//],
    });
    deepEqual(config.ignoreDependencies, ["lodash", "^@types\\/"]);
  });

  it("includes ignoreBinaries", () => {
    const config = buildConfig({ ignoreBinaries: ["prettier"] });
    deepEqual(config.ignoreBinaries, ["prettier"]);
  });

  it("combines all options", () => {
    const config = buildConfig({
      entry: ["src/bin.ts"],
      testFilePatterns: ["test/**/*.spec.ts"],
      configFiles: ["jest.config.js"],
      project: ["src/**/*.ts"],
      ignoreDependencies: ["lodash"],
      ignoreBinaries: ["prettier"],
    });

    deepEqual(config.entry, [
      "src/bin.ts",
      "test/**/*.spec.ts",
      "jest.config.js",
    ]);
    deepEqual(config.project, ["src/**/*.ts"]);
    deepEqual(config.ignoreDependencies, ["lodash"]);
    deepEqual(config.ignoreBinaries, ["prettier"]);
  });
});

describe("formatResults", () => {
  it("returns empty results for no issues", () => {
    const issues = {
      files: new Set<string>(),
      dependencies: {},
      devDependencies: {},
      exports: {},
    };
    const counters = { files: 0, dependencies: 0, total: 0, processed: 50 };

    const results = formatResults(issues, counters);

    deepEqual(results.files, []);
    deepEqual(results.issues, {});
    equal(results.counters.total, 0);
    equal(results.counters.processed, 50);
  });

  it("extracts unused files from the files Set", () => {
    const issues = {
      files: new Set(["src/unused.ts", "src/old.ts"]),
    };
    const counters = { files: 2, total: 2, processed: 10 };

    const results = formatResults(issues, counters);

    deepEqual(results.files, ["src/unused.ts", "src/old.ts"]);
  });

  it("flattens IssueRecords into KnipIssue arrays", () => {
    const issues = {
      files: new Set<string>(),
      dependencies: {
        "package.json": {
          lodash: {
            filePath: "package.json",
            symbol: "lodash",
            type: "dependencies",
          },
        },
      },
      exports: {
        "src/utils.ts": {
          helperFn: {
            filePath: "src/utils.ts",
            symbol: "helperFn",
            line: 10,
            col: 5,
            type: "exports",
          },
          unusedType: {
            filePath: "src/utils.ts",
            symbol: "unusedType",
            line: 20,
            type: "exports",
          },
        },
      },
    };
    const counters = {
      files: 0,
      dependencies: 1,
      exports: 2,
      total: 3,
      processed: 20,
    };

    const results = formatResults(issues, counters);

    equal(results.issues.dependencies?.length, 1);
    equal(results.issues.dependencies?.[0].symbol, "lodash");
    equal(results.issues.dependencies?.[0].filePath, "package.json");

    equal(results.issues.exports?.length, 2);
    equal(results.issues.exports?.[0].symbol, "helperFn");
    equal(results.issues.exports?.[0].line, 10);
    equal(results.issues.exports?.[0].col, 5);
    equal(results.issues.exports?.[1].symbol, "unusedType");
    equal(results.issues.exports?.[1].line, 20);
  });

  it("skips empty IssueRecords", () => {
    const issues = {
      files: new Set<string>(),
      dependencies: {},
      exports: {
        "src/index.ts": {
          foo: {
            filePath: "src/index.ts",
            symbol: "foo",
            type: "exports",
          },
        },
      },
    };
    const counters = { files: 0, dependencies: 0, exports: 1, total: 1, processed: 5 };

    const results = formatResults(issues, counters);

    equal("dependencies" in results.issues, false);
    equal(results.issues.exports?.length, 1);
  });
});
