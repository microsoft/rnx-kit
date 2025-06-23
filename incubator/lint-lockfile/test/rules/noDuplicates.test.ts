import { deepEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRESETS,
  createPackageMap,
  noDuplicatesRule,
} from "../../src/rules/noDuplicates.ts";
import type { Context } from "../../src/types.ts";

describe("rules:noDuplicates()", () => {
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
    "react@npm:19.0.0": {
      package: "react",
      specifiers: ["npm:19.0.0"],
      resolution: "19.0.0",
    },
    "react@npm:^17.0.2": {
      package: "react",
      specifiers: ["npm:^17.0.2"],
      resolution: "17.0.2",
    },
    "react-native@npm:^0.78.0": {
      package: "react-native",
      specifiers: ["npm:^0.78.0"],
      resolution: "0.78.2",
    },
  };

  function mockContext(): [Context, string[]] {
    const errors: string[] = [];
    return [{ packages: [], report: (e) => errors.push(e) }, errors];
  }

  it("creates package map from package list", () => {
    const packages = ["react-native", ["react", 2], ["left-pad", 0]] as const;

    deepEqual(createPackageMap(packages), {
      "react-native": 1,
      react: 2,
      "left-pad": 0,
    });
  });

  it("allows overriding built-in presets", () => {
    const packages = [
      "#react-native",
      ["left-pad", 0],
      ["react", 9000],
    ] as const;

    deepEqual(createPackageMap(packages), {
      ...PRESETS["#react-native"],
      "left-pad": 0,
      react: 9000,
    });
  });

  it("does not create rule if disabled", () => {
    ok(!noDuplicatesRule({ enabled: false }));
  });

  it("does not create rule if no packages are specified", () => {
    ok(!noDuplicatesRule({ packages: [] }));
  });

  it("does not flag allowed duplicate packages", () => {
    const noDuplicates = noDuplicatesRule({
      packages: [["react", 2], "react-native"],
    });

    ok(noDuplicates);

    const [context, errors] = mockContext();
    for (const [key, pkg] of Object.entries(lockfile)) {
      noDuplicates(context, key, pkg);
    }

    deepEqual(errors, []);
  });

  it("flags duplicate packages", () => {
    const noDuplicates = noDuplicatesRule({
      packages: [
        ["@ampproject/remapping", 0],
        "@babel/code-frame",
        "react",
        "react-native",
      ],
    });

    ok(noDuplicates);

    const [context, errors] = mockContext();

    for (const [key, pkg] of Object.entries(lockfile)) {
      noDuplicates(context, key, pkg);
    }

    deepEqual(errors, [
      "Multiple copies of '@ampproject/remapping' found in the lockfile",
      "Multiple copies of '@babel/code-frame' found in the lockfile",
      "Multiple copies of 'react' found in the lockfile",
    ]);
  });
});
