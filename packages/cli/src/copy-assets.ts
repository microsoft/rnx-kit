import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { error, info, warn } from "@rnx-kit/console";
import { isNonEmptyArray } from "@rnx-kit/tools-language/array";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { findPackageDir } from "@rnx-kit/tools-node/package";
import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import { parsePlatform } from "@rnx-kit/tools-react-native";
import * as fs from "fs-extra";
import * as path from "path";

export type NativeAssets = {
  assets?: string[];
  strings?: string[];
  aar?: {
    targetName: string;
    version?: string;
    env?: Record<string, string | number>;
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

export type AssetsConfig = {
  getAssets?: (context: Context) => Promise<NativeAssets>;
};

export type Context = {
  projectRoot: string;
  manifest: PackageManifest;
  options: Options;
};

function ensureOption(options: Options, opt: string, flag = opt) {
  if (options[opt] == null) {
    error(`Missing required option: --${flag}`);
    process.exit(1);
  }
}

function isAssetsConfig(config: unknown): config is AssetsConfig {
  return typeof config === "object" && config !== null && "getAssets" in config;
}

function keysOf(record: Record<string, unknown> | undefined): string[] {
  return record ? Object.keys(record) : [];
}

async function assembleAarBundle(
  _context: Context,
  _packageName: string,
  { aar }: NativeAssets
): Promise<void> {
  if (!aar) {
    return;
  }

  const { targetName } = aar;
  console.log(`./gradlew :${targetName}:assembleRelease`);
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
      if (await fs.pathExists(reactNativeConfig)) {
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
  if (await fs.pathExists(reactNativeConfig)) {
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
      warn(`Skipped "${packageName}": getAssets is not a function`);
      continue;
    }

    info(`Copying assets for "${packageName}"`);

    const assets = await getAssets(context);
    await copyAssets(context, packageName, assets);
    if (options.bundleAar) {
      assembleAarBundle(context, packageName, assets);
    }
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
