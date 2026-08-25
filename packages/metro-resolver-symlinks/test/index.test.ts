import type { CustomResolver, ResolutionContext } from "metro-resolver";
import { resolve } from "metro-resolver";
import { deepEqual } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { makeResolver } from "../src/symlinkResolver.ts";
import { useFixture } from "./fixtures.ts";

function makeContext(
  resolveRequest: CustomResolver,
  freeze = false
): ResolutionContext {
  const context = {
    originModulePath: "",
    doesFileExist: fs.existsSync,
    fileSystemLookup: (absoluteOrProjectRelativePath: string) => {
      if (!fs.existsSync(absoluteOrProjectRelativePath)) {
        return { exists: false };
      }

      const stat = fs.statSync(absoluteOrProjectRelativePath);
      return {
        exists: true,
        type: stat.isFile() ? "f" : "d",
        realPath: path.resolve(absoluteOrProjectRelativePath),
      };
    },
    getPackage: (packageJsonPath: string) => {
      const json = fs.readFileSync(packageJsonPath, { encoding: "utf-8" });
      return JSON.parse(json);
    },
    getPackageForModule: (absoluteModulePath: string) => {
      if (!absoluteModulePath) {
        return null;
      }
    },
    isAssetFile: () => false,
    mainFields: ["react-native", "browser", "main"],
    nodeModulesPaths: [".", "..", "../.."],
    redirectModulePath: (modulePath: string) => modulePath,
    resolveRequest,
    sourceExts: ["js", "json", "ts", "tsx"],
  } as unknown as ResolutionContext;
  return freeze ? Object.freeze(context) : context;
}

describe("makeResolver", () => {
  const currentWorkingDirectory = process.cwd();

  afterEach(() => {
    process.chdir(currentWorkingDirectory);
  });

  it("returns `react-native` with Metro <0.68", () => {
    const fixture = useFixture("duplicates");
    process.chdir(fixture);

    const resolveRequest = makeResolver(undefined, resolve);
    const context = makeContext(resolveRequest);

    deepEqual(resolveRequest(context, "react-native", "ios"), {
      filePath: path.join(fixture, "node_modules", "react-native", "index.js"),
      type: "sourceFile",
    });
  });

  it("returns `react-native` with Metro >=0.68", () => {
    const fixture = useFixture("duplicates");
    process.chdir(fixture);

    const resolveRequest = makeResolver(undefined, resolve);
    const context = makeContext(resolve, true);

    deepEqual(resolveRequest(context, "react-native", "ios"), {
      filePath: path.join(fixture, "node_modules", "react-native", "index.js"),
      type: "sourceFile",
    });
  });
});
