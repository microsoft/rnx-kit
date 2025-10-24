import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { splitSourcePath } from "../src/write-third-party-notices.ts";
import { absolutePathRoot } from "./pathHelper.ts";

describe("splitSourcePath", () => {
  it("absolutePath", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/myPackage/myFile.js`
    );
    equal(moduleName, "myPackage");
    equal(modulePath, `${absolutePathRoot}src/root/node_modules/myPackage`);
  });

  it("nonRootAbsolutePath", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/otherRoot`,
      `${absolutePathRoot}src/root/node_modules/myPackage/myFile.js`
    );
    equal(moduleName, "myPackage");
    equal(modulePath, `${absolutePathRoot}src/root/node_modules/myPackage`);
  });

  it("packageFolderWithoutFile", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/myPackage`
    );
    equal(moduleName, "myPackage");
    equal(modulePath, `${absolutePathRoot}src/root/node_modules/myPackage`);
  });

  it("packageFolderWithNestedNodeModulesFiles", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/myPackage/node_modules/nestedPackage/nestedFile.js`
    );
    equal(moduleName, "nestedPackage");
    equal(
      modulePath,
      `${absolutePathRoot}src/root/node_modules/myPackage/node_modules/nestedPackage`
    );
  });

  it("packageFolderWithNestedNodeModulesFilesAndNamespaces", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/@myframework/driver-utils/node_modules/@myframework/telemetry-utils/lib/config.js`
    );
    equal(moduleName, "@myframework/telemetry-utils");
    equal(
      modulePath,
      `${absolutePathRoot}src/root/node_modules/@myframework/driver-utils/node_modules/@myframework/telemetry-utils`
    );
  });

  it("intermediateFolders", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/otherSrcFolder/node_modules/myPackage/myFile.js`
    );
    equal(moduleName, "myPackage");
    equal(
      modulePath,
      `${absolutePathRoot}src/root/otherSrcFolder/node_modules/myPackage`
    );
  });

  it("scopedPackage", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/@scope/myPackage/myFile.js`
    );
    equal(moduleName, "@scope/myPackage");
    equal(
      modulePath,
      `${absolutePathRoot}src/root/node_modules/@scope/myPackage`
    );
  });

  it("relativePaths", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      "node_modules/myPackage/myFile.js"
    );
    equal(moduleName, "myPackage");
    equal(modulePath, `${absolutePathRoot}src/root/node_modules/myPackage`);
  });

  it("relativePathsWithDotDot", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `../node_modules/myPackage/myFile.js`
    );
    equal(moduleName, "myPackage");
    equal(modulePath, `${absolutePathRoot}src/node_modules/myPackage`);
  });

  it("relativePathsWithDotDotColldingOnNames", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      "../node_modules/../other/node_modules/wrongPackage/../myPackage/myFile.js"
    );
    equal(moduleName, "myPackage");
    equal(modulePath, `${absolutePathRoot}src/other/node_modules/myPackage`);
  });
});
