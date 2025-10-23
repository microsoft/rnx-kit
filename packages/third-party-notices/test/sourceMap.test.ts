import { equal } from "node:assert/strict";
import * as nodefs from "node:fs";
import { describe, it } from "node:test";
import type { SourceMap, WriteThirdPartyNoticesOptions } from "../src/types.ts";
import {
  extractModuleNameToPathMap as extractModuleNameToPathMapActual,
  parseSourceMap as parseSourceMapActual,
} from "../src/write-third-party-notices.ts";
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

  function extractModuleNameToPathMap(
    options: WriteThirdPartyNoticesOptions,
    currentPackageId: string | undefined,
    sourceMap: SourceMap
  ) {
    return extractModuleNameToPathMapActual(
      options,
      currentPackageId,
      sourceMap,
      fs
    );
  }

  function parseSourceMap(
    options: WriteThirdPartyNoticesOptions,
    currentPackageId: string | undefined,
    moduleNameToPath: Map<string, string>,
    sourceMap: SourceMap
  ) {
    return parseSourceMapActual(
      options,
      currentPackageId,
      moduleNameToPath,
      sourceMap,
      fs
    );
  }

  it("parseSourceMap", () => {
    const sourceMap = {
      sources: [
        "node_modules/myPackage/file.js",
        "node_modules/myPackage/file2.js",
        "node_modules/@scope/myOtherPackage/file.js",
      ],
    };
    const map = new Map();
    parseSourceMap(options, undefined, map, sourceMap);

    equal(map.size, 2);
    equal(
      map.get("myPackage"),
      `${absolutePathRoot}src/node_modules/myPackage`
    );
    equal(
      map.get("@scope/myOtherPackage"),
      `${absolutePathRoot}src/node_modules/@scope/myOtherPackage`
    );
  });

  it("extractModuleNameToPathMap", () => {
    const map = extractModuleNameToPathMap(options, undefined, {
      sources: [
        "node_modules/myPackage/file.js",
        "node_modules/myPackage/file2.js",
      ],
      sections: [
        {
          map: {
            sources: [
              "node_modules/myPackage/file2.js",
              "node_modules/myPackage2/file2.js",
            ],
          },
        },
        {
          map: {
            sources: [
              "node_modules/@scope/myOtherPackage/file.js",
              "node_modules/@scope2/myOtherPackage/file.js",
            ],
          },
        },
      ],
    });

    equal(map.size, 4);
    equal(
      map.get("myPackage"),
      `${absolutePathRoot}src/node_modules/myPackage`
    );
    equal(
      map.get("myPackage2"),
      `${absolutePathRoot}src/node_modules/myPackage2`
    );
    equal(
      map.get("@scope/myOtherPackage"),
      `${absolutePathRoot}src/node_modules/@scope/myOtherPackage`
    );
    equal(
      map.get("@scope2/myOtherPackage"),
      `${absolutePathRoot}src/node_modules/@scope2/myOtherPackage`
    );
  });
});
