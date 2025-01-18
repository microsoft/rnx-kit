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
function splitFileName(file: string): [string, string | number] {
  const match = /^(.*?)(?:\.([a-zA-Z0-9]*))?\.[jt]sx?$/.exec(file);
  return match ? [match[1], match[2]] : [file, baseKey];
}

type FileEntry = { file: string; status: "found" | "built" | "checked" };
type FileCollection = Record<string | number, FileEntry>;
type ExtensionLookup = Record<string, (string | number)[]>;
const baseKey = 0;

/**
 * add an entry to the appropriate task array and mark the entry as built or checked
 */
function addFileEntryToTask(
  entry: FileEntry,
  task: BuildTaskOptions,
  checkOnly: boolean
) {
  if (entry.status === "found" && !checkOnly) {
    task.build!.push(entry.file);
    entry.status = "built";
  } else {
    task.check!.push(entry.file);
    entry.status = "checked";
  }
}

/**
 * Take a collection of files will the same base name and all platform extensions and add them
 * to the appropriate tasks with as little overlap as possible. Everything should get type-checked
 * at least once and built once (unless checkOnly is true)
 */
function addFileCollectionToTasks(
  files: FileCollection,
  tasks: BuildTaskOptions[],
  extensionLookup: ExtensionLookup,
  checkOnly: boolean
) {
  // iterate through the tasks and pick files
  for (const task of tasks) {
    const platform = task.platform!;
    const extensions = extensionLookup[platform];
    for (const ext of extensions) {
      if (files[ext]) {
        addFileEntryToTask(files[ext], task, checkOnly);
        break;
      }
    }
  }
  // add any remaining files to the base task
  for (const key in files) {
    const entry = files[key];
    if (
      entry.status === "found" ||
      (!checkOnly && entry.status === "checked")
    ) {
      addFileEntryToTask(entry, tasks[0], checkOnly);
    }
  }
}

function splitFilesToTasks(
  files: string[],
  tasks: BuildTaskOptions[],
  extensionLookup: ExtensionLookup,
  checkOnly: boolean
) {
  let fileCollection: FileCollection = {};
  let lastBase: string | undefined = undefined;
  files.forEach((file) => {
    const [base, ext] = splitFileName(file);
    if (base === lastBase) {
      fileCollection[ext] = { file, status: "found" };
    } else {
      addFileCollectionToTasks(
        fileCollection,
        tasks,
        extensionLookup,
        checkOnly
      );
      lastBase = base;
      fileCollection = {};
    }
  });
  addFileCollectionToTasks(fileCollection, tasks, extensionLookup, checkOnly);
}

export function multiplexForPlatforms(
  files: string[],
  base: BuildTaskOptions,
  checkOnly: boolean,
  platforms?: AllPlatforms[]
): BuildTaskOptions[] {
  if (!platforms || platforms.length === 0) {
    return [base];
  }
  const extensions: ExtensionLookup = {};
  const tasks: BuildTaskOptions[] = [];
  platforms.forEach((platform) => {
    extensions[platform] = platformExtensions(platform);
    extensions[platform].push(baseKey);
    tasks.push({ ...base, platform, build: [], check: [] });
  });
  splitFilesToTasks(files, tasks, extensions, checkOnly);
  return tasks;
}
