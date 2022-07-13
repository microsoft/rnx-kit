import { normalizePath } from "../src/write-third-party-notices";

// this is different from the one in pathHelper due to this having to test cross platform path normalization.
import os from "os";
const absolutePathRoot = os.platform() === "win32" ? "o:/" : "/";

describe("normalizePath", () => {
  // WebPack Urls
  test("webPackIgnored", () => {
    expect(
      normalizePath(
        `webpack:///ignored|${absolutePathRoot}project\\node_modules\\yargs\\build|fs`
      )
    ).toBe(`ignored|${absolutePathRoot}project/node_modules/yargs/build|fs`);
  });

  test("webPackAbsolute", () => {
    expect(
      normalizePath(
        "webpack:///../node_modules/@fluidframework/agent-scheduler/lib/scheduler.js"
      )
    ).toBe("../node_modules/@fluidframework/agent-scheduler/lib/scheduler.js");
  });

  test("webPackRelative", () => {
    expect(normalizePath("webpack:///./src/documentModel.ts")).toBe(
      "./src/documentModel.ts"
    );
  });

  test("webPackStartup", () => {
    expect(normalizePath("webpack:///webpack/startup")).toBe("webpack/startup");
  });

  test("webPackPackage", () => {
    expect(normalizePath("webpack://myPkg/path", "myPkg")).toBe("path");
  });

  test("webPackScopedPackage", () => {
    expect(normalizePath("webpack://@scope/myPkg/path", "@scope/myPkg")).toBe(
      "path"
    );
  });

  test("webPackNestedNodeModelesByNoHoistOrNotYarn", () => {
    const path =
      "webpack://@ms/office-test-project-runtime/../../node_modules/@myframework/driver-utils/node_modules/@myframework/telemetry-utils/lib/config.js";
    expect(normalizePath(path)).toBe(path);
  });

  // Paths
  test("relativePath", () => {
    expect(normalizePath("folder/file")).toBe("folder/file");
  });

  test("dotdotRelativePath", () => {
    expect(normalizePath("../folder/../otherfolder/file")).toBe(
      "../folder/../otherfolder/file"
    );
  });

  test("absolutePath", () => {
    expect(normalizePath(`${absolutePathRoot}folder/file`)).toBe(
      `${absolutePathRoot}folder/file`
    );
  });

  // Windows Paths
  test("relativeWindowsPath", () => {
    expect(normalizePath("folder\\file")).toBe("folder/file");
  });

  test("dotdotRelativeWindowsPath", () => {
    expect(normalizePath("..\\folder\\..\\otherfolder\\file")).toBe(
      "../folder/../otherfolder/file"
    );
  });

  test("absoluteWindowsPath", () => {
    expect(normalizePath(`${absolutePathRoot}folder\\file`)).toBe(
      `${absolutePathRoot}folder/file`
    );
  });

  // Casing
  test("case perserving", () => {
    expect(normalizePath("FoLdeR/FiLe")).toBe("FoLdeR/FiLe");
  });
});
