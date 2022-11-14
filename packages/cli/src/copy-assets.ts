import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { error, info, warn } from "@rnx-kit/console";
import { isNonEmptyArray } from "@rnx-kit/tools-language/array";
import { keysOf } from "@rnx-kit/tools-language/properties";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import {
  findPackageDependencyDir,
  findPackageDir,
  readPackage,
} from "@rnx-kit/tools-node/package";
import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import { parsePlatform } from "@rnx-kit/tools-react-native";
import type { SpawnSyncOptions } from "child_process";
import { spawnSync } from "child_process";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

export type AndroidArchive = {
  targetName?: string;
  version?: string;
  output?: string;
  android?: {
    androidPluginVersion?: string;
    compileSdkVersion?: number;
    defaultConfig?: {
      minSdkVersion?: number;
      targetSdkVersion?: number;
    };
  };
};

export type NativeAssets = {
  assets?: string[];
  strings?: string[];
  aar?: AndroidArchive & {
    env?: Record<string, string | number>;
    dependencies?: Record<string, AndroidArchive>;
  };
  xcassets?: string[];
};

export type Options = {
  platform: AllPlatforms;
  assetsDest: string;
  bundleAar: boolean;
  xcassetsDest?: string;
  [key: string]: unknown;
};

export type Context = {
  projectRoot: string;
  manifest: PackageManifest;
  options: Options;
};

export type AssetsConfig = {
  getAssets?: (context: Context) => Promise<NativeAssets>;
};

const defaultAndroidConfig: Required<Required<AndroidArchive>["android"]> = {
  androidPluginVersion: "7.1.3",
  compileSdkVersion: 31,
  defaultConfig: {
    minSdkVersion: 23,
    targetSdkVersion: 29,
  },
};

function ensureOption(options: Options, opt: string, flag = opt) {
  if (options[opt] == null) {
    error(`Missing required option: --${flag}`);
    process.exit(1);
  }
}

function findGradleProject(projectRoot: string): string | undefined {
  if (fs.existsSync(path.join(projectRoot, "android", "build.gradle"))) {
    return path.join(projectRoot, "android");
  }
  if (fs.existsSync(path.join(projectRoot, "build.gradle"))) {
    return projectRoot;
  }
  return undefined;
}

function gradleTargetName(packageName: string): string {
  return (
    packageName.startsWith("@") ? packageName.slice(1) : packageName
  ).replace(/[^\w\-.]+/g, "_");
}

function isAssetsConfig(config: unknown): config is AssetsConfig {
  return typeof config === "object" && config !== null && "getAssets" in config;
}

export function versionOf(pkgName: string): string {
  const packageDir = findPackageDependencyDir(pkgName);
  if (!packageDir) {
    throw new Error(`Could not find module '${pkgName}'`);
  }

  const { version } = readPackage(packageDir);
  return version;
}

function getAndroidPaths(
  context: Context,
  packageName: string,
  { targetName, version, output }: AndroidArchive
) {
  const projectRoot = findPackageDependencyDir(packageName);
  if (!projectRoot) {
    throw new Error(`Could not find module '${packageName}'`);
  }

  const gradleFriendlyName = targetName || gradleTargetName(packageName);
  const aarVersion = version || versionOf(packageName);

  switch (packageName) {
    case "hermes-engine":
      return {
        targetName: gradleFriendlyName,
        version: aarVersion,
        projectRoot,
        output: path.join(projectRoot, "android", "hermes-release.aar"),
        destination: path.join(
          context.options.assetsDest,
          "aar",
          `hermes-release-${versionOf(packageName)}.aar`
        ),
      };

    case "react-native":
      return {
        targetName: gradleFriendlyName,
        version: aarVersion,
        projectRoot,
        output: path.join(projectRoot, "android"),
        destination: path.join(
          context.options.assetsDest,
          "aar",
          "react-native"
        ),
      };

    default: {
      const androidProject = findGradleProject(projectRoot);
      return {
        targetName: gradleFriendlyName,
        version: aarVersion,
        projectRoot,
        androidProject,
        output:
          output ||
          (androidProject &&
            path.join(
              androidProject,
              "build",
              "outputs",
              "aar",
              `${gradleFriendlyName}-release.aar`
            )),
        destination: path.join(
          context.options.assetsDest,
          "aar",
          `${gradleFriendlyName}-${aarVersion}.aar`
        ),
      };
    }
  }
}

function run(command: string, args: string[], options: SpawnSyncOptions) {
  const { status } = spawnSync(command, args, options);
  if (status !== 0) {
    process.exit(status || 1);
  }
}

export async function assembleAarBundle(
  context: Context,
  packageName: string,
  { aar }: NativeAssets
): Promise<void> {
  if (!aar) {
    return;
  }

  const findUp = require("find-up");
  const gradlew = await findUp(
    os.platform() === "win32" ? "gradlew.bat" : "gradlew"
  );
  if (!gradlew) {
    warn(`Skipped \`${packageName}\`: cannot find \`gradlew\``);
    return;
  }

  const { targetName, version, androidProject, output } = getAndroidPaths(
    context,
    packageName,
    aar
  );
  if (!androidProject || !output) {
    warn(`Skipped \`${packageName}\`: cannot find \`build.gradle\``);
    return;
  }

  const { env: customEnv, dependencies, android } = aar;
  const env = {
    NODE_MODULES_PATH: path.join(process.cwd(), "node_modules"),
    REACT_NATIVE_VERSION: versionOf("react-native"),
    ...process.env,
    ...customEnv,
  };

  const outputDir = path.join(context.options.assetsDest, "aar");
  await fs.ensureDir(outputDir);

  const dest = path.join(outputDir, `${targetName}-${version}.aar`);

  const targets = [`:${targetName}:assembleRelease`];
  const targetsToCopy: [string, string][] = [[output, dest]];

  const settings = path.join(androidProject, "settings.gradle");
  if (fs.existsSync(settings)) {
    if (dependencies) {
      for (const [dependencyName, aar] of Object.entries(dependencies)) {
        const { targetName, output, destination } = getAndroidPaths(
          context,
          dependencyName,
          aar
        );
        if (output) {
          if (!fs.existsSync(output)) {
            targets.push(`:${targetName}:assembleRelease`);
            targetsToCopy.push([output, destination]);
          } else if (!fs.existsSync(destination)) {
            targetsToCopy.push([output, destination]);
          }
        }
      }
    }

    // Run only one Gradle task at a time
    run(gradlew, targets, { cwd: androidProject, stdio: "inherit", env });
  } else {
    const reactNativePath = findPackageDependencyDir("react-native");
    if (!reactNativePath) {
      throw new Error("Could not find 'react-native'");
    }

    const buildDir = path.join(
      process.cwd(),
      "node_modules",
      ".rnx-gradle-build",
      targetName
    );

    const compileSdkVersion =
      android?.compileSdkVersion ?? defaultAndroidConfig.compileSdkVersion;
    const minSdkVersion =
      android?.defaultConfig?.minSdkVersion ??
      defaultAndroidConfig.defaultConfig.minSdkVersion;
    const targetSdkVersion =
      android?.defaultConfig?.targetSdkVersion ??
      defaultAndroidConfig.defaultConfig.targetSdkVersion;
    const androidPluginVersion =
      android?.androidPluginVersion ??
      defaultAndroidConfig.androidPluginVersion;
    const buildRelativeReactNativePath = path.relative(
      buildDir,
      reactNativePath
    );

    const buildGradle = [
      "buildscript {",
      "  ext {",
      `      compileSdkVersion = ${compileSdkVersion}`,
      `      minSdkVersion = ${minSdkVersion}`,
      `      targetSdkVersion = ${targetSdkVersion}`,
      `      androidPluginVersion = "${androidPluginVersion}"`,
      "  }",
      "",
      "  repositories {",
      "      mavenCentral()",
      "      google()",
      "  }",
      "",
      "  dependencies {",
      '      classpath("com.android.tools.build:gradle:${project.ext.androidPluginVersion}")',
      "  }",
      "}",
      "",
      "allprojects {",
      "  repositories {",
      "      maven {",
      "          // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm",
      `          url("\${rootDir}/${buildRelativeReactNativePath}/android")`,
      "      }",
      "      mavenCentral()",
      "      google()",
      "  }",
      "}",
      "",
    ].join("\n");

    const gradleProperties = "android.useAndroidX=true\n";

    const settingsGradle = [
      `include(":${targetName}")`,
      `project(":${targetName}").projectDir = file(${JSON.stringify(
        androidProject
      )})`,
      "",
    ].join("\n");

    await fs.ensureDir(buildDir);
    await fs.writeFile(path.join(buildDir, "build.gradle"), buildGradle);
    await fs.writeFile(
      path.join(buildDir, "gradle.properties"),
      gradleProperties
    );
    await fs.writeFile(path.join(buildDir, "settings.gradle"), settingsGradle);

    // Run only one Gradle task at a time
    run(gradlew, targets, { cwd: buildDir, stdio: "inherit", env });
  }

  await Promise.all(targetsToCopy.map(([src, dest]) => fs.copy(src, dest)));
}

async function copyFiles(files: unknown, destination: string): Promise<void> {
  if (!isNonEmptyArray<string>(files)) {
    return;
  }

  await fs.ensureDir(destination);
  await Promise.all(
    files.map((file) => {
      const basename = path.basename(file);
      return fs.copy(file, `${destination}/${basename}`);
    })
  );
}

async function copyXcodeAssets(
  xcassets: unknown,
  destination: string
): Promise<void> {
  if (!isNonEmptyArray<string>(xcassets)) {
    return;
  }

  await fs.ensureDir(destination);
  await Promise.all(
    xcassets.map((catalog) => {
      const dest = `${destination}/${path.basename(catalog)}`;
      return fs.copy(catalog, dest);
    })
  );
}

export async function copyAssets(
  { options: { assetsDest, xcassetsDest } }: Context,
  packageName: string,
  { assets, strings, xcassets }: NativeAssets
): Promise<void> {
  const tasks = [
    copyFiles(assets, `${assetsDest}/assets/${packageName}`),
    copyFiles(strings, `${assetsDest}/strings/${packageName}`),
  ];

  if (typeof xcassetsDest === "string") {
    tasks.push(copyXcodeAssets(xcassets, xcassetsDest));
  }

  await Promise.all(tasks);
}

export async function gatherConfigs({
  projectRoot,
  manifest,
}: Context): Promise<Record<string, AssetsConfig | null> | undefined> {
  const { dependencies, devDependencies } = manifest;
  const packages = [...keysOf(dependencies), ...keysOf(devDependencies)];
  if (packages.length === 0) {
    return;
  }

  const resolveOptions = { paths: [projectRoot] };
  const assetsConfigs: Record<string, AssetsConfig | null> = {};

  for (const pkg of packages) {
    try {
      const pkgPath = path.dirname(
        require.resolve(`${pkg}/package.json`, resolveOptions)
      );
      const reactNativeConfig = `${pkgPath}/react-native.config.js`;
      if (fs.existsSync(reactNativeConfig)) {
        const { nativeAssets } = require(reactNativeConfig);
        if (nativeAssets) {
          assetsConfigs[pkg] = nativeAssets;
        }
      }
    } catch (err) {
      warn(err);
    }
  }

  // Overrides from project config
  const reactNativeConfig = `${projectRoot}/react-native.config.js`;
  if (fs.existsSync(reactNativeConfig)) {
    const { nativeAssets } = require(reactNativeConfig);
    const overrides = Object.entries(nativeAssets);
    for (const [pkgName, config] of overrides) {
      if (config === null || isAssetsConfig(config)) {
        assetsConfigs[pkgName] = config;
      }
    }
  }

  return assetsConfigs;
}

/**
 * Copies additional assets not picked by bundlers into desired directory.
 *
 * The way this works is by scanning all direct dependencies of the current
 * project for a file, `react-native.config.js`, whose contents include a
 * field, `nativeAssets`, and a function that returns assets to copy:
 *
 * ```js
 * // react-native.config.js
 * module.exports = {
 *   nativeAssets: {
 *     getAssets: (context) => {
 *       return {
 *         assets: [],
 *         strings: [],
 *         xcassets: [],
 *       };
 *     }
 *   }
 * };
 * ```
 *
 * We also allow the project itself to override this where applicable. The
 * format is similar and looks like this:
 *
 * ```js
 * // react-native.config.js
 * module.exports = {
 *   nativeAssets: {
 *     "some-library": {
 *       getAssets: (context) => {
 *         return {
 *           assets: [],
 *           strings: [],
 *           xcassets: [],
 *         };
 *       }
 *     },
 *     "another-library": {
 *       getAssets: (context) => {
 *         return {
 *           assets: [],
 *           strings: [],
 *           xcassets: [],
 *         };
 *       }
 *     }
 *   }
 * };
 * ```
 *
 * @param options Options dictate what gets copied where
 */
export async function copyProjectAssets(options: Options): Promise<void> {
  const projectRoot = findPackageDir() || process.cwd();
  const content = await fs.readFile(`${projectRoot}/package.json`, {
    encoding: "utf-8",
  });
  const manifest: PackageManifest = JSON.parse(content);
  const context = { projectRoot, manifest, options };
  const assetConfigs = await gatherConfigs(context);
  if (!assetConfigs) {
    return;
  }

  const dependencies = Object.entries(assetConfigs);
  for (const [packageName, config] of dependencies) {
    if (!isAssetsConfig(config)) {
      continue;
    }

    const { getAssets } = config;
    if (typeof getAssets !== "function") {
      warn(`Skipped \`${packageName}\`: getAssets is not a function`);
      continue;
    }

    const assets = await getAssets(context);
    if (options.bundleAar && assets.aar) {
      info(`Assembling "${packageName}"`);
      await assembleAarBundle(context, packageName, assets);
    } else {
      info(`Copying assets for "${packageName}"`);
      await copyAssets(context, packageName, assets);
    }
  }

  if (options.bundleAar) {
    const dummyAar = { targetName: "dummy" };
    const copyTasks = [];
    for (const dependencyName of ["hermes-engine", "react-native"]) {
      const { output, destination } = getAndroidPaths(
        context,
        dependencyName,
        dummyAar
      );
      if (
        output &&
        (!fs.existsSync(destination) || fs.statSync(destination).isDirectory())
      ) {
        info(`Copying Android Archive of "${dependencyName}"`);
        copyTasks.push(fs.copy(output, destination));
      }
    }
    await Promise.all(copyTasks);
  }
}

export const rnxCopyAssetsCommand = {
  name: "rnx-copy-assets",
  description:
    "Copies additional assets not picked by bundlers into desired directory.",
  func: (_argv: string[], _config: CLIConfig, options: Options) => {
    ensureOption(options, "platform");
    ensureOption(options, "assetsDest", "assets-dest");
    return copyProjectAssets(options);
  },
  options: [
    {
      name: "--platform <string>",
      description: "platform to target",
      parse: parsePlatform,
    },
    {
      name: "--assets-dest <string>",
      description: "path of the directory to copy assets into",
    },
    {
      name: "--bundle-aar <boolean>",
      description: "whether to bundle AARs of dependencies",
      default: false,
    },
    {
      name: "--xcassets-dest <string>",
      description:
        "path of the directory to copy Xcode asset catalogs into. Asset catalogs will only be copied if a destination path is specified.",
    },
  ],
};
