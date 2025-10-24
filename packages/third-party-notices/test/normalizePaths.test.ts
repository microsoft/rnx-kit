import { equal } from "node:assert/strict";
import * as os from "node:os";
import { describe, it } from "node:test";
import { normalizePath } from "../src/write-third-party-notices.ts";

// this is different from the one in pathHelper due to this having to test cross platform path normalization.
const absolutePathRoot = os.platform() === "win32" ? "o:/" : "/";

describe("normalizePath", () => {
  // WebPack Urls
  it("webPackIgnored", () => {
    equal(
      normalizePath(
        `webpack:///ignored|${absolutePathRoot}project\\node_modules\\yargs\\build|fs`
      ),
      `ignored|${absolutePathRoot}project/node_modules/yargs/build|fs`
    );
  });

  it("webPackAbsolute", () => {
    equal(
      normalizePath(
        "webpack:///../node_modules/@fluidframework/agent-scheduler/lib/scheduler.js"
      ),
      "../node_modules/@fluidframework/agent-scheduler/lib/scheduler.js"
    );
  });

  it("webPackRelative", () => {
    equal(
      normalizePath("webpack:///./src/documentModel.ts"),
      "./src/documentModel.ts"
    );
  });

  it("webPackStartup", () => {
    equal(normalizePath("webpack:///webpack/startup"), "webpack/startup");
  });

  it("webPackPackage", () => {
    equal(normalizePath("webpack://myPkg/path", "myPkg"), "path");
  });

  it("webPackScopedPackage", () => {
    equal(normalizePath("webpack://@scope/myPkg/path", "@scope/myPkg"), "path");
  });

  it("webPackNestedNodeModelesByNoHoistOrNotYarn", () => {
    const path =
      "webpack://@ms/office-test-project-runtime/../../node_modules/@myframework/driver-utils/node_modules/@myframework/telemetry-utils/lib/config.js";
    equal(normalizePath(path), path);
  });

  // Paths
  it("relativePath", () => {
    equal(normalizePath("folder/file"), "folder/file");
  });

  it("dotdotRelativePath", () => {
    equal(
      normalizePath("../folder/../otherfolder/file"),
      "../folder/../otherfolder/file"
    );
  });

  it("absolutePath", () => {
    equal(
      normalizePath(`${absolutePathRoot}folder/file`),
      `${absolutePathRoot}folder/file`
    );
  });

  // Windows Paths
  it("relativeWindowsPath", () => {
    equal(normalizePath("folder\\file"), "folder/file");
  });

  it("dotdotRelativeWindowsPath", () => {
    equal(
      normalizePath("..\\folder\\..\\otherfolder\\file"),
      "../folder/../otherfolder/file"
    );
  });

  it("absoluteWindowsPath", () => {
    equal(
      normalizePath(`${absolutePathRoot}folder\\file`),
      `${absolutePathRoot}folder/file`
    );
  });

  // Casing
  it("case perserving", () => {
    equal(normalizePath("FoLdeR/FiLe"), "FoLdeR/FiLe");
  });
});
