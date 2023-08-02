import { splitSourcePath } from "../src/write-third-party-notices";
import { absolutePathRoot } from "./pathHelper";

describe("splitSourcePath", () => {
  test("absolutePath", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/myPackage/myFile.js`
    );
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/root/node_modules/myPackage`
    );
  });

  test("nonRootAbsolutePath", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/otherRoot`,
      `${absolutePathRoot}src/root/node_modules/myPackage/myFile.js`
    );
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/root/node_modules/myPackage`
    );
  });

  test("packageFolderWithoutFile", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/myPackage`
    );
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/root/node_modules/myPackage`
    );
  });

  test("packageFolderWithNestedNodeModulesFiles", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/myPackage/node_modules/nestedPackage/nestedFile.js`
    );
    expect(moduleName).toBe("nestedPackage");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/root/node_modules/myPackage/node_modules/nestedPackage`
    );
  });

  test("packageFolderWithNestedNodeModulesFilesAndNamespaces", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/@myframework/driver-utils/node_modules/@myframework/telemetry-utils/lib/config.js`
    );
    expect(moduleName).toBe("@myframework/telemetry-utils");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/root/node_modules/@myframework/driver-utils/node_modules/@myframework/telemetry-utils`
    );
  });

  test("intermediateFolders", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/otherSrcFolder/node_modules/myPackage/myFile.js`
    );
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/root/otherSrcFolder/node_modules/myPackage`
    );
  });

  test("scopedPackage", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `${absolutePathRoot}src/root/node_modules/@scope/myPackage/myFile.js`
    );
    expect(moduleName).toBe("@scope/myPackage");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/root/node_modules/@scope/myPackage`
    );
  });

  test("relativePaths", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      "node_modules/myPackage/myFile.js"
    );
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/root/node_modules/myPackage`
    );
  });

  test("relativePathsWithDotDot", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      `../node_modules/myPackage/myFile.js`
    );
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe(`${absolutePathRoot}src/node_modules/myPackage`);
  });

  test("relativePathsWithDotDotColldingOnNames", () => {
    const [moduleName, modulePath] = splitSourcePath(
      `${absolutePathRoot}src/root`,
      "../node_modules/../other/node_modules/wrongPackage/../myPackage/myFile.js"
    );
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe(
      `${absolutePathRoot}src/other/node_modules/myPackage`
    );
  });
});
