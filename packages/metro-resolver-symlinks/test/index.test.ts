import type { CustomResolver, ResolutionContext } from "metro-resolver";
import { resolve } from "metro-resolver";
import * as fs from "node:fs";
import * as path from "node:path";
import { makeResolver } from "../src/symlinkResolver";
import { useFixture } from "./fixtures";

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

  test("returns `react-native` with Metro <0.68", () => {
    const fixture = useFixture("duplicates");
    process.chdir(fixture);

    const resolveRequest = makeResolver();
    const context = makeContext(resolveRequest);

    expect(resolveRequest(context, "react-native", "ios")).toEqual({
      filePath: path.join(fixture, "node_modules", "react-native", "index.js"),
      type: "sourceFile",
    });
  });

  test("returns `react-native` with Metro >=0.68", () => {
    const fixture = useFixture("duplicates");
    process.chdir(fixture);

    const resolveRequest = makeResolver();
    const context = makeContext(resolve, true);

    expect(resolveRequest(context, "react-native", "ios")).toEqual({
      filePath: path.join(fixture, "node_modules", "react-native", "index.js"),
      type: "sourceFile",
    });
  });
});
