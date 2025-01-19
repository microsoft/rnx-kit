import {
  type BundleConfig,
  getKitConfigFromPackageJson,
} from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node";
import {
  type AllPlatforms,
  getPlatformPackageName,
  platformExtensions,
  platformValues,
} from "@rnx-kit/tools-react-native";
import type { BuildTaskOptions } from "./build";

/**
 * See if any of the react-native platform dependencies are present in the given dependencies object
 * @param deps - an object containing the package's dependencies, can be one of [peer|dev]dependencies
 * @param foundPlatforms - adds any react-native platform dependencies to the foundPlatforms object
 */
function findReactNativePlatformsFromDeps(
  manifest: PackageManifest,
  foundPlatforms: Record<AllPlatforms, boolean>
) {
  // merge dependencies together, we only care about existence not version
  const deps = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  };

  // create a mapping of platform to package name
  const allPlatforms = platformValues();
  const allPackages = allPlatforms.map((p) => getPlatformPackageName(p));

  allPlatforms.forEach((platform, index) => {
    if (deps[allPackages[index]]) {
      foundPlatforms[platform] = true;
    }
  });
}

/**
 * Extract applicable platform from config.targets or config.platforms
 * @param config bundle config for the resolved rnx-kit configuration
 * @param foundPlatforms platform map to update with the platforms found in the bundle config
 */
function findReactNativePlatformsFromBundleConfig(
  config: BundleConfig,
  foundPlatforms: Record<AllPlatforms, boolean>
) {
  const allPlatforms = platformValues();
  if (config.platforms && typeof config.platforms === "object") {
    allPlatforms.forEach((platform) => {
      if (config.platforms![platform]) {
        foundPlatforms[platform] = true;
      }
    });
  }
  const targets = Array.isArray(config.targets) ? config.targets : [];
  targets.forEach((target) => {
    if (typeof target === "string" && allPlatforms.includes(target)) {
      foundPlatforms[target] = true;
    }
  });
}

/**
 * This determines supported react native platforms for a package. For module packages it will key off of the presence of
 * react-native in the dependencies. For app packages it will key off of the bundle configuration.
 *
 * @param manifest parsed package jsos, used for checking dependencies
 * @param packageRoot root path of the package
 * @returns an array of react-native platforms that the package supports
 */
export function detectReactNativePlatforms(
  manifest: PackageManifest,
  packageRoot: string
): AllPlatforms[] | undefined {
  const foundPlatforms: Record<string, boolean> = {};

  const rnxKit = manifest["rnx-kit"];
  if (
    rnxKit &&
    typeof rnxKit.kitType === "string" &&
    rnxKit.kitType === "app"
  ) {
    // for packages marked as an 'app', determine available platforms based on the bundle configuration
    const kitConfig = getKitConfigFromPackageJson(manifest, packageRoot) || {};
    const bundleConfigs = Array.isArray(kitConfig.bundle)
      ? kitConfig.bundle
      : [kitConfig.bundle];
    bundleConfigs.forEach((bundleConfig) => {
      if (bundleConfig && typeof bundleConfig === "object") {
        findReactNativePlatformsFromBundleConfig(bundleConfig, foundPlatforms);
      }
    });
  } else {
    // for all other packages, determine available platforms based on dependencies
    findReactNativePlatformsFromDeps(manifest, foundPlatforms);
  }
  const platforms = Object.keys(foundPlatforms) as AllPlatforms[];
  return platforms.length > 0 ? platforms : undefined;
}

/**
 * Parse a file path to get base path and platform extension, if one exists.
 */
export function splitFileNameAndSuffix(
  file: string
): [string, string | undefined] {
  const match = /^(.*?)(?:\.([a-zA-Z0-9]*))?\.[jt]sx?$/.exec(file);
  return match ? [match[1], match[2]] : [file, undefined];
}

type FoundSuffixes = Record<string, boolean>;
type FileEntry = {
  file: string;
  suffix?: string;
  allSuffixes: FoundSuffixes;
  built?: boolean;
};

/**
 * @returns true if this file is the best match for this platform. if file.android.ts and file.ts exist
 * for the android platform it will only return true for file.android.ts, for ios it will return true for file.ts
 */
function isBestMatch(entry: FileEntry, suffixes: string[]): boolean {
  const { allSuffixes, suffix } = entry;
  // best suffix will be the first found one in the list or undefined if the base file
  const bestSuffix = allSuffixes && suffixes.find((s) => allSuffixes[s]);

  // it's the best match if the strings match or if they are both undefined
  return suffix === bestSuffix;
}

/**
 * Parse the list of files, splitting out suffixes, and create a suffix lookup shared by files with the same
 * base file name. This is used to determine the best match for a platform.
 * @returns a match array of FileEntry structures
 */
function processFileList(files: string[]): FileEntry[] {
  const lookup = new Map<string, FoundSuffixes>();

  const ensureSuffixes = (base: string) => {
    return lookup.get(base) || lookup.set(base, {}).get(base)!;
  };

  return files.map((file) => {
    const [base, suffix] = splitFileNameAndSuffix(file);
    const allSuffixes = ensureSuffixes(base);
    if (suffix) {
      allSuffixes[suffix] = true;
    }
    return { file, suffix, allSuffixes };
  });
}

/**
 * Given the parsed file entries, go through adding the files to the task based on the platform.
 * @param files processed file entry list
 * @param defaultTask is this the task which should build any unbuilt files
 * @param task task to add files to
 */
function addFilesToTask(
  files: FileEntry[],
  defaultTask: boolean,
  task: BuildTaskOptions
) {
  // if we are in checkOnly mode then task.build will be null and we will fall back to the check array
  const pushToBuild = (file: string) => {
    if (task.build) {
      task.build.push(file);
    } else {
      task.check!.push(file);
    }
  };

  const suffixes = platformExtensions(task.platform!);
  for (const entry of files) {
    const bestMatch = isBestMatch(entry, suffixes);
    if (!entry.built && (bestMatch || defaultTask)) {
      pushToBuild(entry.file);
      entry.built = true;
    } else if (bestMatch) {
      task.check!.push(entry.file);
    }
  }
}

export function multiplexForPlatforms(
  files: string[],
  base: BuildTaskOptions,
  checkOnly: boolean,
  platforms?: AllPlatforms[]
): BuildTaskOptions[] {
  // no platforms then we have nothing to do
  if (!platforms || platforms.length === 0) {
    return [base];
  }

  // set up the tasks for each platform, build array is undefined in checkOnly mode
  const tasks: BuildTaskOptions[] = platforms.map((platform) => {
    return { ...base, platform, build: checkOnly ? undefined : [], check: [] };
  });

  // parse the files into file entries with suffixes already split out
  const entries = processFileList(files);

  // now iterate through the tasks in reverse order setting the default task as last
  for (let i = tasks.length - 1; i >= 0; i--) {
    addFilesToTask(entries, i === 0, tasks[i]);
  }

  return tasks;
}
