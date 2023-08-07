import type { WriteThirdPartyNoticesOptions } from "../src/types";
import {
  extractModuleNameToPathMap,
  parseSourceMap,
} from "../src/write-third-party-notices";
import { absolutePathRoot } from "./pathHelper";

jest.mock("fs");

const options: WriteThirdPartyNoticesOptions = {
  rootPath: `${absolutePathRoot}src`,
  json: false,
};

describe("parseModule", () => {
  test("parseSourceMap", () => {
    const sourceMap = {
      sources: [
        "node_modules/myPackage/file.js",
        "node_modules/myPackage/file2.js",
        "node_modules/@scope/myOtherPackage/file.js",
      ],
    };
    const map = new Map();
    parseSourceMap(options, undefined, map, sourceMap);

    expect(map.size).toBe(2);
    expect(map.get("myPackage")).toBe(
      `${absolutePathRoot}src/node_modules/myPackage`
    );
    expect(map.get("@scope/myOtherPackage")).toBe(
      `${absolutePathRoot}src/node_modules/@scope/myOtherPackage`
    );
  });

  test("extractModuleNameToPathMap", () => {
    const sourceMap = {
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
    };
    const map = extractModuleNameToPathMap(options, undefined, sourceMap);

    expect(map.size).toBe(4);
    expect(map.get("myPackage")).toBe(
      `${absolutePathRoot}src/node_modules/myPackage`
    );
    expect(map.get("myPackage2")).toBe(
      `${absolutePathRoot}src/node_modules/myPackage2`
    );
    expect(map.get("@scope/myOtherPackage")).toBe(
      `${absolutePathRoot}src/node_modules/@scope/myOtherPackage`
    );
    expect(map.get("@scope2/myOtherPackage")).toBe(
      `${absolutePathRoot}src/node_modules/@scope2/myOtherPackage`
    );
  });
});
