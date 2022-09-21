import { spawnSync } from "child_process";
import * as path from "path";
import { findFiles, mockFiles } from "./helpers";
import { assembleAarBundle } from "../../src/copy-assets";

jest.mock("child_process");
jest.mock("fs");
jest.unmock("@rnx-kit/console");

export const options = {
  platform: "android" as const,
  assetsDest: "dist",
  bundleAar: true,
};

export const context = {
  projectRoot: path.resolve(__dirname, "..", ".."),
  manifest: {
    name: "@rnx-kit/cli",
    version: "0.0.0-dev",
  },
  options,
};

describe("assembleAarBundle", () => {
  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const spawnSyncSpy = jest.spyOn(require("child_process"), "spawnSync");

  afterEach(() => {
    mockFiles();
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  test("returns early if there is nothing to assemble", async () => {
    await assembleAarBundle(context, context.manifest.name, {});

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(findFiles()).toEqual([]);
  });

  test("returns early if Gradle wrapper cannot be found", async () => {
    await assembleAarBundle(context, context.manifest.name, { aar: {} });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/cannot find `gradlew`$/)
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
      "node_modules/@rnx-kit/react-native-auth/package.json": JSON.stringify({
        version: "0.0.0-dev",
      }),
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
        JSON.stringify({ version: "0.0.0-dev" }),
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
      "node_modules/@rnx-kit/react-native-auth/package.json": JSON.stringify({
        version: "0.0.0-dev",
      }),
      "node_modules/react-native/package.json": JSON.stringify({
        version: "1000.0.0-dev",
      }),
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
        JSON.stringify({ version: "0.0.0-dev" }),
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]react-native[/\\]package.json$/
        ),
        JSON.stringify({ version: "1000.0.0-dev" }),
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
      "node_modules/@rnx-kit/react-native-auth/package.json": JSON.stringify({
        version: "0.0.0-dev",
      }),
      "node_modules/react-native/package.json": JSON.stringify({
        version: "1000.0.0-dev",
      }),
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
        JSON.stringify({ version: "0.0.0-dev" }),
      ],
      [
        expect.stringMatching(
          /[/\\]node_modules[/\\]react-native[/\\]package.json$/
        ),
        JSON.stringify({ version: "1000.0.0-dev" }),
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
      "node_modules/@rnx-kit/react-native-auth/package.json": JSON.stringify({
        version: "0.0.0-dev",
      }),
      "node_modules/react-native/package.json": JSON.stringify({
        version: "1000.0.0-dev",
      }),
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
