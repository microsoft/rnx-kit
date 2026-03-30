import { equal } from "node:assert/strict";
import * as nodefs from "node:fs";
import { describe, it } from "node:test";
import type { WriteThirdPartyNoticesOptions } from "../src/types.ts";
import { parseModule as parseModuleActual } from "../src/write-third-party-notices.ts";
import { absolutePathRoot } from "./pathHelper.ts";

describe("parseModule", () => {
  const fs = {
    ...nodefs,
    existsSync: (p: nodefs.PathLike) => !p.toString().includes("missing"),
  };

  const options: WriteThirdPartyNoticesOptions = {
    rootPath: `${absolutePathRoot}src`,
    sourceMapFile: "",
    json: false,
  };

  const optionsWithIgnores: WriteThirdPartyNoticesOptions = {
    rootPath: `${absolutePathRoot}src`,
    sourceMapFile: "",
    json: false,
    ignoreModules: ["ignoredModule"],
    ignoreScopes: ["@ignoredScope"],
  };

  function parseModule(
    options: WriteThirdPartyNoticesOptions,
    moduleNameToPath: Map<string, string>,
    p: string
  ) {
    return parseModuleActual(options, moduleNameToPath, p, fs);
  }

  it("basicExisting", () => {
    const map = new Map();
    parseModule(options, map, "node_modules/myPackage/file.js");

    equal(map.size, 1);
    equal(
      map.get("myPackage"),
      `${absolutePathRoot}src/node_modules/myPackage`
    );
  });

  it("basicExistingWithScope", () => {
    const map = new Map();
    parseModule(options, map, "node_modules/@myScope/myPackage/file.js");

    equal(map.size, 1);
    equal(
      map.get("@myScope/myPackage"),
      `${absolutePathRoot}src/node_modules/@myScope/myPackage`
    );
  });

  it("basicNonExistentPath", () => {
    const map = new Map();
    parseModule(options, map, "node_modules/@myScope/missingPackage/file.js");

    equal(map.size, 0);
  });

  it("ignoredModule", () => {
    const map = new Map();
    parseModule(optionsWithIgnores, map, "node_modules/ignoredModule/file.js");

    equal(map.size, 0);
  });

  it("ignoredModuleInScopeNotIgnored", () => {
    const map = new Map();
    parseModule(
      optionsWithIgnores,
      map,
      "node_modules/@scope/ignoredModule/file.js"
    );

    equal(map.size, 1);
    equal(
      map.get("@scope/ignoredModule"),
      `${absolutePathRoot}src/node_modules/@scope/ignoredModule`
    );
  });

  it("ignoredScope", () => {
    const map = new Map();
    parseModule(
      optionsWithIgnores,
      map,
      "node_modules/@ignoredScope/myPackage/file.js"
    );

    equal(map.size, 0);
  });

  it("ignoredScope", () => {
    const map = new Map();
    parseModule(
      optionsWithIgnores,
      map,
      "node_modules/@ignoredScopeYetNot/myPackage/file.js"
    );

    equal(map.size, 1);
    equal(
      map.get("@ignoredScopeYetNot/myPackage"),
      `${absolutePathRoot}src/node_modules/@ignoredScopeYetNot/myPackage`
    );
  });
});
