import * as path from "path";
import { assembleAarBundle } from "../../src/copy-assets";

jest.mock("child_process");
jest.mock("fs");
jest.unmock("@rnx-kit/console");

describe("assembleAarBundle", () => {
  const fs = require("fs");
  const fsx = require("fs-extra");

  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const spawnSyncSpy = jest.spyOn(require("child_process"), "spawnSync");

  const options = {
    platform: "android" as const,
    assetsDest: "dist",
    bundleAar: true,
  };

  const context = {
    projectRoot: path.resolve(__dirname, "..", ".."),
    manifest: {
      name: "@rnx-kit/cli",
      version: "0.0.0-dev",
    },
    options,
  };

  const dummyManifest = JSON.stringify({ version: "0.0.0-dev" });

  function findFiles() {
    return Object.entries(fsx.__toJSON());
  }

  function mockFiles(files: Record<string, string> = {}) {
    fs.__setMockFiles(files);
    fsx.__setMockFiles(files);
  }

  afterEach(() => {
    mockFiles();
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  test("returns early if there is nothing to assemble", async () => {
    mockFiles({
      gradlew: "",
      "gradlew.bat": "",
    });

    await assembleAarBundle(context, context.manifest.name, {});

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(findFiles()).toEqual([
      [expect.stringMatching(/[/\\]gradlew$/), ""],
      [expect.stringMatching(/[/\\]gradlew.bat$/), ""],
    ]);
  });

  test("returns early if Gradle wrapper cannot be found", async () => {
    await assembleAarBundle(context, context.manifest.name, { aar: {} });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/cannot find `gradlew(.bat)?`$/)
    );
    expect(spawnSyncSpy).not.toHaveBeenCalled();
    expect(findFiles()).toEqual([]);
  });

  test("throws if target package cannot be found", async () => {
    mockFiles({
      gradlew: "",
      "gradlew.bat": "",
    });

    expect(
      assembleAarBundle(context, context.manifest.name, { aar: {} })
    ).rejects.toThrow();
    expect(findFiles()).toEqual([
      [expect.stringMatching(/[/\\]gradlew$/), ""],
      [expect.stringMatching(/[/\\]gradlew.bat$/), ""],
    ]);
  });

  test("returns early if Gradle project cannot be found", async () => {
    mockFiles({
      gradlew: "",
      "gradlew.bat": "",
      "node_modules/@rnx-kit/react-native-auth/package.json": dummyManifest,
    });

    await assembleAarBundle(context, "@rnx-kit/react-native-auth", { aar: {} });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/cannot find `build.gradle`/)
    );
    expect(spawnSyncSpy).not.toHaveBeenCalled();
    expect(findFiles()).toEqual([
      [expect.stringMatching(/[/\\]gradlew$/), ""],
      [expect.stringMatching(/[/\\]gradlew.bat$/), ""],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]package.json$/
        ),
        dummyManifest,
      ],
    ]);
  });

  test("generates Android project if necessary", async () => {
    mockFiles({
      gradlew: "",
      "gradlew.bat": "",
      "node_modules/@rnx-kit/react-native-auth/android/build.gradle":
        "build.gradle",
      "node_modules/@rnx-kit/react-native-auth/android/build/outputs/aar/rnx-kit_react-native-auth-release.aar":
        "rnx-kit_react-native-auth-release.aar",
      "node_modules/@rnx-kit/react-native-auth/package.json": dummyManifest,
      "node_modules/react-native/package.json": dummyManifest,
    });

    await assembleAarBundle(context, "@rnx-kit/react-native-auth", { aar: {} });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(spawnSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]gradlew(?:\.bat)?$/),
      [":rnx-kit_react-native-auth:assembleRelease"],
      expect.objectContaining({
        cwd: expect.stringMatching(
          /[/\\]node_modules[/\\].rnx-gradle-build[/\\]rnx-kit_react-native-auth$/
        ),
      })
    );
    expect(findFiles()).toEqual([
      [expect.stringMatching(/[/\\]gradlew$/), ""],
      [expect.stringMatching(/[/\\]gradlew.bat$/), ""],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]android[/\\]build.gradle$/
        ),
        "build.gradle",
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]android[/\\]build[/\\]outputs[/\\]aar[/\\]rnx-kit_react-native-auth-release.aar$/
        ),
        "rnx-kit_react-native-auth-release.aar",
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]package.json$/
        ),
        dummyManifest,
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]react-native[/\\]package.json$/
        ),
        dummyManifest,
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\].rnx-gradle-build[/\\]rnx-kit_react-native-auth[/\\]build.gradle$/
        ),
        expect.stringMatching(/^buildscript/),
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\].rnx-gradle-build[/\\]rnx-kit_react-native-auth[/\\]gradle.properties/
        ),
        expect.stringMatching(/^android.useAndroidX=true/),
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\].rnx-gradle-build[/\\]rnx-kit_react-native-auth[/\\]settings.gradle$/
        ),
        expect.stringMatching(
          /include\(":rnx-kit_react-native-auth"\)\nproject\(":rnx-kit_react-native-auth"\).projectDir = file\(".*?(\/|\\\\)node_modules(\/|\\\\)@rnx-kit(\/|\\\\)react-native-auth(\/|\\\\)android"\)/
        ),
      ],
      [
        expect.stringMatching(
          /[/\\]dist[/\\]aar[/\\]rnx-kit_react-native-auth-0.0.0-dev.aar$/
        ),
        "rnx-kit_react-native-auth-release.aar",
      ],
    ]);
  });

  test("assembles Android archive using existing project", async () => {
    mockFiles({
      gradlew: "",
      "gradlew.bat": "",
      "node_modules/@rnx-kit/react-native-auth/android/build.gradle":
        "build.gradle",
      "node_modules/@rnx-kit/react-native-auth/android/build/outputs/aar/rnx-kit_react-native-auth-release.aar":
        "rnx-kit_react-native-auth-release.aar",
      "node_modules/@rnx-kit/react-native-auth/android/settings.gradle":
        "settings.gradle",
      "node_modules/@rnx-kit/react-native-auth/package.json": dummyManifest,
      "node_modules/react-native/package.json": dummyManifest,
    });

    await assembleAarBundle(context, "@rnx-kit/react-native-auth", { aar: {} });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(spawnSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]gradlew(?:\.bat)?$/),
      [":rnx-kit_react-native-auth:assembleRelease"],
      expect.objectContaining({
        cwd: expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]android$/
        ),
      })
    );
    expect(findFiles()).toEqual([
      [expect.stringMatching(/[/\\]gradlew$/), ""],
      [expect.stringMatching(/[/\\]gradlew.bat$/), ""],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]android[/\\]build.gradle$/
        ),
        "build.gradle",
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]android[/\\]build[/\\]outputs[/\\]aar[/\\]rnx-kit_react-native-auth-release.aar$/
        ),
        "rnx-kit_react-native-auth-release.aar",
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]android[/\\]settings.gradle$/
        ),
        "settings.gradle",
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]@rnx-kit[/\\]react-native-auth[/\\]package.json$/
        ),
        dummyManifest,
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]react-native[/\\]package.json$/
        ),
        dummyManifest,
      ],
      [
        expect.stringMatching(
          /[/\\]dist[/\\]aar[/\\]rnx-kit_react-native-auth-0.0.0-dev.aar$/
        ),
        "rnx-kit_react-native-auth-release.aar",
      ],
    ]);
  });

  test("allows the generated Android project to be configured", async () => {
    mockFiles({
      gradlew: "",
      "gradlew.bat": "",
      "node_modules/@rnx-kit/react-native-auth/android/build.gradle":
        "build.gradle",
      "node_modules/@rnx-kit/react-native-auth/android/build/outputs/aar/rnx-kit_react-native-auth-release.aar":
        "rnx-kit_react-native-auth-release.aar",
      "node_modules/@rnx-kit/react-native-auth/package.json": dummyManifest,
      "node_modules/react-native/package.json": dummyManifest,
    });

    await assembleAarBundle(context, "@rnx-kit/react-native-auth", {
      aar: {
        android: {
          androidPluginVersion: "7.1.3",
          compileSdkVersion: 31,
          defaultConfig: {
            minSdkVersion: 26,
            targetSdkVersion: 30,
          },
        },
      },
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(spawnSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]gradlew(?:\.bat)?$/),
      [":rnx-kit_react-native-auth:assembleRelease"],
      expect.objectContaining({
        cwd: expect.stringMatching(
          /[/\\]node_modules[/\\].rnx-gradle-build[/\\]rnx-kit_react-native-auth$/
        ),
      })
    );
    expect(findFiles()).toEqual(
      expect.arrayContaining([
        [
          expect.stringMatching(
            /[/\\]node_modules[/\\].rnx-gradle-build[/\\]rnx-kit_react-native-auth[/\\]build.gradle$/
          ),
          expect.stringMatching(
            /compileSdkVersion = 31\s+minSdkVersion = 26\s+targetSdkVersion = 30\s+androidPluginVersion = "7\.1\.3"/
          ),
        ],
      ])
    );
  });
});
