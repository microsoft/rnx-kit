import { mockFS } from "@rnx-kit/tools-filesystem/mocks";
import * as child_process from "node:child_process";
import * as path from "node:path";
import { assembleAarBundle } from "../../src/copy-assets";

jest.mock("node:child_process");
jest.unmock("@rnx-kit/console");

describe("copy-assets/assembleAarBundle()", () => {
  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const spawnSyncSpy = jest.spyOn(child_process, "spawnSync");

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
    reactNativePath: require.resolve("react-native"),
  };

  const cwd = process.cwd();
  const dummyManifest = JSON.stringify({ version: "0.0.0-dev" });
  const gradleWrapper = path.join(
    cwd,
    process.platform === "win32" ? "gradlew.bat" : "gradlew"
  );
  const authDir = path.join(
    cwd,
    "node_modules",
    "@rnx-kit",
    "react-native-auth"
  );
  const authBuildArtifact = path.join(
    authDir,
    "android",
    "build",
    "outputs",
    "aar",
    "rnx-kit_react-native-auth-release.aar"
  );
  const authBuildGradle = path.join(authDir, "android", "build.gradle");
  const authManifest = path.join(authDir, "package.json");
  const rnManifest = path.join(
    cwd,
    "node_modules",
    "react-native",
    "package.json"
  );

  afterEach(() => {
    consoleWarnSpy.mockReset();
    spawnSyncSpy.mockReset();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  test("returns early if there is nothing to assemble", async () => {
    const files = { [gradleWrapper]: "" };

    await assembleAarBundle(context, context.manifest.name, {}, mockFS(files));

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(Object.entries(files)).toEqual([[gradleWrapper, ""]]);
  });

  test("returns early if Gradle wrapper cannot be found", async () => {
    const files = {};

    await assembleAarBundle(
      context,
      context.manifest.name,
      { aar: {} },
      mockFS(files)
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/cannot find `gradlew(.bat)?`$/)
    );
    expect(spawnSyncSpy).not.toHaveBeenCalled();
    expect(Object.entries(files)).toEqual([]);
  });

  test("throws if target package cannot be found", async () => {
    const files = { [gradleWrapper]: "" };

    expect(
      assembleAarBundle(
        context,
        context.manifest.name,
        { aar: {} },
        mockFS(files)
      )
    ).rejects.toThrow();
    expect(Object.entries(files)).toEqual([[gradleWrapper, ""]]);
  });

  test("returns early if Gradle project cannot be found", async () => {
    const files = {
      [gradleWrapper]: "",
      [authManifest]: dummyManifest,
    };

    await assembleAarBundle(
      context,
      "@rnx-kit/react-native-auth",
      { aar: {} },
      mockFS(files)
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/cannot find `build.gradle`/)
    );
    expect(spawnSyncSpy).not.toHaveBeenCalled();
    expect(Object.entries(files)).toEqual([
      [gradleWrapper, ""],
      [authManifest, dummyManifest],
    ]);
  });

  test("generates Android project if necessary", async () => {
    child_process.spawnSync.mockReturnValue({ status: 0 });

    const files = {
      [gradleWrapper]: "",
      [authBuildGradle]: path.basename(authBuildGradle),
      [authBuildArtifact]: path.basename(authBuildArtifact),
      [authManifest]: dummyManifest,
      [rnManifest]: dummyManifest,
    };

    await assembleAarBundle(
      context,
      "@rnx-kit/react-native-auth",
      { aar: {} },
      mockFS(files)
    );

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
    expect(Object.entries(files)).toEqual([
      [gradleWrapper, ""],
      [authBuildGradle, path.basename(authBuildGradle)],
      [authBuildArtifact, path.basename(authBuildArtifact)],
      [authManifest, dummyManifest],
      [rnManifest, dummyManifest],
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
          /dist[/\\]aar[/\\]rnx-kit_react-native-auth-0.0.0-dev.aar$/
        ),
        path.basename(authBuildArtifact),
      ],
    ]);
  });

  test("assembles Android archive using existing project", async () => {
    child_process.spawnSync.mockReturnValue({ status: 0 });

    const authSettingsGradle = path.join(authDir, "android", "settings.gradle");
    const files = {
      [gradleWrapper]: "",
      [authBuildGradle]: path.basename(authBuildGradle),
      [authBuildArtifact]: path.basename(authBuildArtifact),
      [authSettingsGradle]: path.basename(authSettingsGradle),
      [authManifest]: dummyManifest,
      [rnManifest]: dummyManifest,
    };

    await assembleAarBundle(
      context,
      "@rnx-kit/react-native-auth",
      { aar: {} },
      mockFS(files)
    );

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
    expect(Object.entries(files)).toEqual([
      [gradleWrapper, ""],
      [authBuildGradle, path.basename(authBuildGradle)],
      [authBuildArtifact, path.basename(authBuildArtifact)],
      [authSettingsGradle, path.basename(authSettingsGradle)],
      [authManifest, dummyManifest],
      [rnManifest, dummyManifest],
      [
        expect.stringMatching(
          /dist[/\\]aar[/\\]rnx-kit_react-native-auth-0.0.0-dev.aar$/
        ),
        path.basename(authBuildArtifact),
      ],
    ]);
  });

  test("allows the generated Android project to be configured", async () => {
    child_process.spawnSync.mockReturnValue({ status: 0 });

    const files = {
      [gradleWrapper]: "",
      [authBuildGradle]: path.basename(authBuildGradle),
      [authBuildArtifact]: path.basename(authBuildArtifact),
      [authManifest]: dummyManifest,
      [rnManifest]: dummyManifest,
    };

    await assembleAarBundle(
      context,
      "@rnx-kit/react-native-auth",
      {
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
      },
      mockFS(files)
    );

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
    expect(Object.entries(files)).toEqual(
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
