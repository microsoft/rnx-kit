import type { KitConfig } from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node";
import { type BuildTaskOptions } from "../src/build";
import {
  detectReactNativePlatforms,
  multiplexForPlatforms,
  splitFileNameAndSuffix,
} from "../src/platforms";

const baseManifest: PackageManifest = {
  name: "test-package",
  version: "1.0.0",
  dependencies: {},
  devDependencies: {},
  peerDependencies: {},
};

describe("detectReactNativePlatforms", () => {
  it("should detect platforms from react-native dependency", () => {
    const manifest: PackageManifest = {
      ...baseManifest,
      dependencies: { "react-native": "0.74.4" },
    };
    const platforms = detectReactNativePlatforms(manifest, process.cwd());
    expect(platforms).toEqual(["android", "ios"]);
  });

  it("should detect platforms from react-native-windows peer dependency", () => {
    const manifest: PackageManifest = {
      ...baseManifest,
      devDependencies: { "react-native": "0.74.4" },
      peerDependencies: { "react-native-windows": "0.74.4" },
    };
    const platforms = detectReactNativePlatforms(manifest, process.cwd());
    expect(platforms).toEqual(["android", "ios", "windows"]);
  });

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
    const platforms = detectReactNativePlatforms(manifest, process.cwd());
    expect(platforms).toEqual(["android", "ios", "windows"]);
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
    const platforms = detectReactNativePlatforms(manifest, process.cwd());
    expect(platforms).toEqual(["android", "ios"]);
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

function allFilesBuilt(files: string[], tasks: BuildTaskOptions[]): boolean {
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

describe("multiplexForPlatforms", () => {
  it("should return the existing task if no platforms are specified", async () => {
    const task: BuildTaskOptions = { build: mockFiles };
    const tasks = multiplexForPlatforms(mockFiles, task, false);
    expect(tasks).toHaveLength(1);
    expect(allFilesBuilt(mockFiles, tasks)).toBe(true);
    expect(tasks[0]).toBe(task);
  });

  it("should work with a single platform", () => {
    const tasks = multiplexForPlatforms(mockFiles, {}, false, ["android"]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({
      build: mockFiles,
      check: [],
      platform: "android",
    });
    expect(allFilesBuilt(mockFiles, tasks)).toBe(true);
  });

  it("should work with a single platform in check only mode", () => {
    const tasks = multiplexForPlatforms(mockFiles, {}, true, ["ios"]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({
      check: mockFiles,
      platform: "ios",
    });
  });

  it("should work with multiple platforms", () => {
    const tasks = multiplexForPlatforms(mockFiles, {}, false, [
      "android",
      "ios",
    ]);
    expect(tasks).toHaveLength(2);
    expect(allFilesBuilt(mockFiles, tasks)).toBe(true);

    expect(tasks[0]).toEqual({
      build: [
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
      ],
      check: ["src/index.ts"],
      platform: "android",
    });

    expect(tasks[1]).toEqual({
      build: [
        "src/file1.native.ts",
        "src/file2.ios.ts",
        "src/index.ts",
        "src/ux.ios.tsx",
      ],
      check: [],
      platform: "ios",
    });
  });
});
