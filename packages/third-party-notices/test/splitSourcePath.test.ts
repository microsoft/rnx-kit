import {splitSourcePath} from "../src/write-third-party-notices";

describe("splitSourcePath", () => {

  test("absolutePath", () => {
    const [moduleName, modulePath] = splitSourcePath("o:\\src\\root", "o:/src/root/node_modules/myPackage/myFile.js");
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe("o:\\src\\root\\node_modules\\myPackage");
  });

  test("nonRootAbsolutePath", () => {
    const [moduleName, modulePath] = splitSourcePath("o:\\src\\otherRoot", "o:/src/root/node_modules/myPackage/myFile.js");
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe("o:\\src\\root\\node_modules\\myPackage");
  });

  test("packageFolderWithoutFile", () => {
    const [moduleName, modulePath] = splitSourcePath("o:\\src\\root", "o:/src/root/node_modules/myPackage");
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe("o:\\src\\root\\node_modules\\myPackage");
  });

  test("packageFolderWithNestedNodeModulesFiles", () => {
    const [moduleName, modulePath] = splitSourcePath("o:\\src\\root", "o:/src/root/node_modules/myPackage/node_modules/nestedPackage/nestedFile.js");
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe("o:\\src\\root\\node_modules\\myPackage");
  });

  test("intermediateFolders", () => {
    const [moduleName, modulePath] = splitSourcePath("o:\\src\\root", "o:/src/root/otherSrcFolder/node_modules/myPackage/myFile.js");
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe("o:\\src\\root\\otherSrcFolder\\node_modules\\myPackage");
  });

  test("scopedPackage", () => {
    const [moduleName, modulePath] = splitSourcePath("o:\\src\\root", "o:/src/root/node_modules/@scope/myPackage/myFile.js");
    expect(moduleName).toBe("@scope/myPackage");
    expect(modulePath).toBe("o:\\src\\root\\node_modules\\@scope\\myPackage");
  });


  test("relativePaths", () => {
    const [moduleName, modulePath] = splitSourcePath("o:\\src\\root", "node_modules/myPackage/myFile.js");
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe("o:\\src\\root\\node_modules\\myPackage");
  });


  test("relativePathsWithDotDot", () => {
    const [moduleName, modulePath] = splitSourcePath("o:\\src\\root", "../node_modules/myPackage/myFile.js");
    expect(moduleName).toBe("myPackage");
    expect(modulePath).toBe("o:\\src\\node_modules\\myPackage");
  });


  // BUG: Code should normalize path before extracting package names
  // test("relativePathsWithDotDotColldingOnNames", () => {
  //   const [moduleName, modulePath] = splitSourcePath("o:\\src\\root", "../node_modules/../other/node_modules/wrongPackage/../myPackage/myFile.js");
  //   expect(moduleName).toBe("myPackage");
  //   expect(modulePath).toBe("o:\\src\\other\\node_modules\\myPackage");
  // });

  // BUG: Code should normalize path before extracting package names
  //




});
