import type { KitConfig } from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node";
import type ts from "typescript";
import {
  isBestMatch,
  loadPackagePlatformInfo,
  multiplexForPlatforms,
  parseSourceFileReference,
  type FileEntry,
} from "../src/platforms.ts";
import { createReporter } from "../src/reporter.ts";
import type { BuildContext, PlatformInfo } from "../src/types.ts";

const baseManifest: PackageManifest = {
  name: "test-package",
  version: "1.0.0",
  dependencies: {},
  devDependencies: {},
  peerDependencies: {},
};

describe("loadReactNativePlatforms", () => {
  it("should detect platforms from bundle targets", () => {
    const kitConfig: KitConfig = {
      kitType: "app",
      bundle: {
        targets: ["android", "ios", "windows"],
      },
    };
    const manifest: PackageManifest = {
      ...baseManifest,
      "rnx-kit": kitConfig,
    };
    const platforms = loadPackagePlatformInfo(process.cwd(), manifest);
    expect(Object.keys(platforms)).toEqual(["android", "ios", "windows"]);
  });

  it("should detect platforms from multiple bundle targets", () => {
    const kitConfig: KitConfig = {
      kitType: "app",
      bundle: [
        {
          platforms: {
            android: {},
          },
        },
        {
          platforms: {
            ios: {},
          },
        },
      ],
    };
    const manifest: PackageManifest = {
      ...baseManifest,
      "rnx-kit": kitConfig,
    };
    const platforms = loadPackagePlatformInfo(process.cwd(), manifest);
    expect(Object.keys(platforms)).toEqual(["android", "ios"]);
  });
});

describe("isBestMatch", () => {
  it("should return true if the platform is an exact match", () => {
    const entry: FileEntry = {
      file: "unreferenced",
      allSuffixes: new Set([".android", ".native"]),
    };

    const suffixes = [".android", ".native", "."];
    expect(isBestMatch({ ...entry, suffix: ".android" }, suffixes)).toBe(true);
    expect(isBestMatch({ ...entry, suffix: ".native" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: "" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: ".ios" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: undefined }, suffixes)).toBe(false);
  });

  it("should return true for suffixes in the middle of the list", () => {
    const entry: FileEntry = {
      file: "unreferenced",
      allSuffixes: new Set([".android", ".native"]),
    };
    const suffixes = [".ios", ".native", "."];
    expect(isBestMatch({ ...entry, suffix: ".native" }, suffixes)).toBe(true);
    expect(isBestMatch({ ...entry, suffix: "" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: ".android" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: undefined }, suffixes)).toBe(false);
  });

  it("should find the no-suffix option if it is the best match", () => {
    const entry: FileEntry = {
      file: "unreferenced",
      allSuffixes: new Set([".android", "win32", "ios", "visionos"]),
    };
    const suffixes = [".macos", ".native", "."];
    expect(isBestMatch({ ...entry, suffix: "" }, suffixes)).toBe(true);
    expect(isBestMatch({ ...entry, suffix: ".android" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: ".ios" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: undefined }, suffixes)).toBe(true);
  });
});

describe("parseSourceFileDetails", () => {
  it("should parse a file with no suffix", () => {
    const { base, suffix, ext } = parseSourceFileReference("src/file1.ts");
    expect(base).toBe("src/file1");
    expect(suffix).toBe("");
    expect(ext).toBe(".ts");
  });

  it("should parse a file with a suffix", () => {
    const { base, suffix, ext } = parseSourceFileReference(
      "src/file1.android.ts"
    );
    expect(base).toBe("src/file1");
    expect(suffix).toBe(".android");
    expect(ext).toBe(".ts");
  });

  it("should parse a file with a suffix and a different extension", () => {
    const { base, suffix, ext } = parseSourceFileReference(
      "src/file1.visionos.tsx"
    );
    expect(base).toBe("src/file1");
    expect(suffix).toBe(".visionos");
    expect(ext).toBe(".tsx");
  });

  it("should treat an unsupported extension as a suffixn", () => {
    const { base, suffix, ext } = parseSourceFileReference("src/file1.bogus");
    expect(base).toBe("src/file1");
    expect(suffix).toBe(".bogus");
    expect(ext).toBe("");
  });

  it("should parse a file with no extension", () => {
    const { base, suffix, ext } = parseSourceFileReference("src/file1");
    expect(base).toBe("src/file1");
    expect(suffix).toBe("");
    expect(ext).toBe("");
  });

  it("should parse a suffix with no extension", () => {
    const { base, suffix, ext } = parseSourceFileReference(
      "./src/file1.android"
    );
    expect(base).toBe("./src/file1");
    expect(suffix).toBe(".android");
    expect(ext).toBe("");
  });

  it("should ignore the module suffix if requested", () => {
    const { base, suffix, ext } = parseSourceFileReference(
      "src/file1.android.ts",
      true
    );
    expect(base).toBe("src/file1.android");
    expect(suffix).toBe("");
    expect(ext).toBe(".ts");
  });

  it("should ignore the suffix on a file with no extension", () => {
    const { base, suffix, ext } = parseSourceFileReference(
      "./src/file1.types",
      true
    );
    expect(base).toBe("./src/file1.types");
    expect(suffix).toBe("");
    expect(ext).toBe("");
  });
});

function allFilesBuilt(files: string[], tasks: BuildContext[]): boolean {
  const built: Record<string, boolean> = {};
  tasks.forEach((task) => {
    task.build?.forEach((file) => (built[file] = true));
  });
  for (const file of files) {
    if (!built[file]) {
      return false;
    }
  }
  return true;
}

const mockFiles = [
  "src/file1.ts",
  "src/file1.android.ts",
  "src/file1.native.ts",
  "src/file1.windows.ts",
  "src/file1.macos.ts",
  "src/file1.foo.ts",
  "src/file2.ts",
  "src/file2.ios.ts",
  "src/file2.win32.ts",
  "src/index.ts",
  "src/ux.windows.tsx",
  "src/ux.macos.tsx",
  "src/ux.tsx",
  "src/ux.ios.tsx",
  "src/ux.android.tsx",
];

const allPlatforms: Record<string, PlatformInfo> = {
  android: {
    name: "android",
    pkgName: "react-native",
    suffixes: [".android", ".native", "."],
  },
  ios: {
    name: "ios",
    pkgName: "react-native",
    suffixes: [".ios", ".native", "."],
  },
  windows: {
    name: "windows",
    pkgName: "react-native-windows",
    suffixes: [".windows", ".win", ".native", "."],
  },
  macos: {
    name: "macos",
    pkgName: "react-native-macos",
    suffixes: [".macos", ".native", "."],
  },
};

const baseContext: BuildContext = {
  root: "/src/myPkg",
  reporter: createReporter("mock-reporter"),
  cmdLine: { fileNames: mockFiles, options: {} } as ts.ParsedCommandLine,
};

describe("multiplexForPlatforms", () => {
  it("should return the existing task if no platforms are specified", async () => {
    const task = baseContext;
    const tasks = multiplexForPlatforms(task);
    expect(tasks).toHaveLength(1);
    expect(allFilesBuilt(mockFiles, tasks)).toBe(true);
    expect(tasks[0]).toBe(task);
  });

  it("should work with a single platform", () => {
    const task = {
      ...baseContext,
    } as BuildContext;
    const tasks = multiplexForPlatforms(task, [allPlatforms["android"]]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].build).toEqual(mockFiles);
    expect(tasks[0].check).toEqual([]);
    expect(tasks[0].platform!.name).toBe("android");
    expect(allFilesBuilt(mockFiles, tasks)).toBe(true);
  });

  it("should work with multiple platforms", () => {
    const task = {
      ...baseContext,
    } as BuildContext;
    const tasks = multiplexForPlatforms(task, [
      allPlatforms["android"],
      allPlatforms["ios"],
    ]);
    expect(tasks).toHaveLength(2);
    expect(allFilesBuilt(mockFiles, tasks)).toBe(true);

    expect(tasks[0].build).toEqual([
      "src/file1.ts",
      "src/file1.android.ts",
      "src/file1.windows.ts",
      "src/file1.macos.ts",
      "src/file1.foo.ts",
      "src/file2.ts",
      "src/file2.win32.ts",
      "src/ux.windows.tsx",
      "src/ux.macos.tsx",
      "src/ux.tsx",
      "src/ux.android.tsx",
    ]);
    expect(tasks[0].check).toEqual(["src/index.ts"]),
      expect(tasks[0].platform!.name).toEqual("android");

    expect(tasks[1].build).toEqual([
      "src/file1.native.ts",
      "src/file2.ios.ts",
      "src/index.ts",
      "src/ux.ios.tsx",
    ]);

    expect(tasks[1].check).toEqual([]);
    expect(tasks[1].platform!.name).toEqual("ios");
  });
});
