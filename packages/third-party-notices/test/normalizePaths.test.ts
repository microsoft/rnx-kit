import {normalizePath} from "../src/write-third-party-notices";

describe("normalizePath", () => {
  // WebPack Urls
  test("webPackIgnored", () => {
    expect(
      normalizePath(
        "webpack:///ignored|o:\\OW\\Build\\JsSrc\\wordjs_fluid_x64_debug\\node_modules\\yargs\\build|fs"
      )
    ).toBe("ignored|o:/OW/Build/JsSrc/wordjs_fluid_x64_debug/node_modules/yargs/build|fs");
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


  // Paths
  test("relativePath", () => {
    expect(normalizePath("folder/file")).toBe("folder/file");
  });

  test("dotdotRelativePath", () => {
    expect(normalizePath("../folder/../otherfolder/file")).toBe("../folder/../otherfolder/file");
  });

  test("absolutePath", () => {
    expect(normalizePath("o:/folder/file")).toBe("o:/folder/file");
  });

  // Windows Paths
  test("relativeWindowsPath", () => {
    expect(normalizePath("folder\\file")).toBe("folder/file");
  });

  test("dotdotRelativeWindowsPath", () => {
    expect(normalizePath("..\\folder\\..\\otherfolder\\file")).toBe("../folder/../otherfolder/file");
  });

  test("absoluteWindowsPath", () => {
    expect(normalizePath("o:\\folder\\file")).toBe("o:/folder/file");
  });

  // Casing
  test("case perserving", () => {
    expect(normalizePath("FoLdeR/FiLe")).toBe("FoLdeR/FiLe");
  });


});
