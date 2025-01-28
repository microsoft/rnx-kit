import type { KitConfig } from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node";
import type ts from "typescript";
import {
  isBestMatch,
  loadPkgPlatformInfo,
  multiplexForPlatforms,
  splitFileNameAndSuffix,
  type FileEntry,
} from "../src/platforms";
import type { BuildContext } from "../src/types";

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
    const platforms = loadPkgPlatformInfo(process.cwd(), manifest);
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
    const platforms = loadPkgPlatformInfo(process.cwd(), manifest);
    expect(Object.keys(platforms)).toEqual(["android", "ios"]);
  });
});

describe("isBestMatch", () => {
  it("should return true if the platform is an exact match", () => {
    const entry: FileEntry = {
      file: "unreferenced",
      allSuffixes: { android: true, native: true },
    };
    const suffixes = ["android", "native", ""];
    expect(isBestMatch({ ...entry, suffix: "android" }, suffixes)).toBe(true);
    expect(isBestMatch({ ...entry, suffix: "native" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: "" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: "ios" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: undefined }, suffixes)).toBe(false);
  });

  it("should return true for suffixes in the middle of the list", () => {
    const entry: FileEntry = {
      file: "unreferenced",
      allSuffixes: { android: true, native: true },
    };
    const suffixes = ["ios", "native", ""];
    expect(isBestMatch({ ...entry, suffix: "native" }, suffixes)).toBe(true);
    expect(isBestMatch({ ...entry, suffix: "" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: "android" }, suffixes)).toBe(false);
    expect(isBestMatch({ ...entry, suffix: undefined }, suffixes)).toBe(false);
  });
});

describe("splitFileNameAndSuffix", () => {
  it("should split a file name with no suffix and return one term", () => {
    const [name, suffix] = splitFileNameAndSuffix("src/file1.ts");
    expect(name).toBe("src/file1");
    expect(suffix).toBe(undefined);
  });

  it("should extract a suffix correctly with both .ts and .tsx extensions", () => {
    const [name, suffix] = splitFileNameAndSuffix("src/ux.android.tsx");
    expect(name).toBe("src/ux");
    expect(suffix).toBe("android");
    const [name2, suffix2] = splitFileNameAndSuffix("src/myfile.ios.ts");
    expect(name2).toBe("src/myfile");
    expect(suffix2).toBe("ios");
  });

  it("should work with js and jsx extensions", () => {
    const [name, suffix] = splitFileNameAndSuffix("src/ux.android.jsx");
    expect(name).toBe("src/ux");
    expect(suffix).toBe("android");
    const [name2, suffix2] = splitFileNameAndSuffix("src/myfile.ios.js");
    expect(name2).toBe("src/myfile");
    expect(suffix2).toBe("ios");
  });

  it("should return the last suffix if multiple exist", () => {
    const [name, suffix] = splitFileNameAndSuffix("src/file1.android.ios.ts");
    expect(name).toBe("src/file1.android");
    expect(suffix).toBe("ios");
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

const baseContext: BuildContext = {
  platformInfo: {
    android: { pkgName: "react-native", suffixes: ["android", "native", ""] },
    ios: { pkgName: "react-native", suffixes: ["ios", "native", ""] },
    windows: {
      pkgName: "react-native-windows",
      suffixes: ["windows", "win", "native", ""],
    },
    macos: { pkgName: "react-native-macos", suffixes: ["macos", "native", ""] },
  },

  cmdLine: { fileNames: mockFiles, options: {} } as ts.ParsedCommandLine,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  log: () => {},
  time: (_label, fn) => fn(),
  timeAsync: async (_label, fn) => await fn(),
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
      platform: "android",
      platforms: ["android"],
    } as BuildContext;
    const tasks = multiplexForPlatforms(task);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].build).toEqual(mockFiles);
    expect(tasks[0].check).toEqual([]);
    expect(tasks[0].platform).toBe("android");
    expect(allFilesBuilt(mockFiles, tasks)).toBe(true);
  });

  it("should work with multiple platforms", () => {
    const task = {
      ...baseContext,
      platforms: ["android", "ios"],
    } as BuildContext;
    const tasks = multiplexForPlatforms(task);
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
      expect(tasks[0].platform).toEqual("android");

    expect(tasks[1].build).toEqual([
      "src/file1.native.ts",
      "src/file2.ios.ts",
      "src/index.ts",
      "src/ux.ios.tsx",
    ]);

    expect(tasks[1].check).toEqual([]);
    expect(tasks[1].platform).toEqual("ios");
  });
});
