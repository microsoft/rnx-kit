import type { WriteThirdPartyNoticesOptions } from "../src/types";
import { parseModule } from "../src/write-third-party-notices";
import { absolutePathRoot, osSpecificPath } from "./pathHelper";

jest.mock("fs");

require("fs").existsSync = jest.fn().mockImplementation((path) => {
  return path.indexOf("missing") == -1;
});

const options: WriteThirdPartyNoticesOptions = {
  rootPath: `${absolutePathRoot}src`,
  json: false,
};

const optionsWithIgnores: WriteThirdPartyNoticesOptions = {
  rootPath: `${absolutePathRoot}src`,
  json: false,
  ignoreModules: ["ignoredModule"],
  ignoreScopes: ["@ignoredScope"],
};

describe("parseModule", () => {
  test("basicExisting", () => {
    const map = new Map();
    parseModule(options, map, "node_modules/myPackage/file.js");

    expect(map.size).toBe(1);
    expect(map.get("myPackage")).toBe(
      osSpecificPath(`${absolutePathRoot}src\\node_modules\\myPackage`)
    );
  });

  test("basicExistingWithScope", () => {
    const map = new Map();
    parseModule(options, map, "node_modules/@myScope/myPackage/file.js");

    expect(map.size).toBe(1);
    expect(map.get("@myScope/myPackage")).toBe(
      osSpecificPath(
        `${absolutePathRoot}src\\node_modules\\@myScope\\myPackage`
      )
    );
  });

  test("basicNonExistentPath", () => {
    const map = new Map();
    parseModule(options, map, "node_modules/@myScope/missingPackage/file.js");

    expect(map.size).toBe(0);
  });

  test("ignoredModule", () => {
    const map = new Map();
    parseModule(optionsWithIgnores, map, "node_modules/ignoredModule/file.js");

    expect(map.size).toBe(0);
  });

  test("ignoredModuleInScopeNotIgnored", () => {
    const map = new Map();
    parseModule(
      optionsWithIgnores,
      map,
      "node_modules/@scope/ignoredModule/file.js"
    );

    expect(map.size).toBe(1);
    expect(map.get("@scope/ignoredModule")).toBe(
      osSpecificPath(
        `${absolutePathRoot}src\\node_modules\\@scope\\ignoredModule`
      )
    );
  });

  test("ignoredScope", () => {
    const map = new Map();
    parseModule(
      optionsWithIgnores,
      map,
      "node_modules/@ignoredScope/myPackage/file.js"
    );

    expect(map.size).toBe(0);
  });

  test("ignoredScope", () => {
    const map = new Map();
    parseModule(
      optionsWithIgnores,
      map,
      "node_modules/@ignoredScopeYetNot/myPackage/file.js"
    );

    expect(map.size).toBe(1);
    expect(map.get("@ignoredScopeYetNot/myPackage")).toBe(
      osSpecificPath(
        `${absolutePathRoot}src\\node_modules\\@ignoredScopeYetNot\\myPackage`
      )
    );
  });
});
