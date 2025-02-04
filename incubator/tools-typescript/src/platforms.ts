import {
  getKitConfigFromPackageManifest,
  type KitConfig,
} from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node";
import {
  getAvailablePlatforms,
  platformExtensions,
} from "@rnx-kit/tools-react-native";
import path from "node:path";
import type ts from "typescript";
import type { BuildContext, ParsedFileReference, PlatformInfo } from "./types";

// quick helper for converting a value to an array
function coerceArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

// a list of built-in platforms to use as a fallback
const fallbackPackages: Record<string, string> = {
  android: "react-native",
  ios: "react-native",
  macos: "react-native-macos",
  win32: "@office-iss/react-native-win32",
  windows: "react-native-windows",
  visionos: "@callstack/react-native-visionos",
};

/**
 * @returns a PlatformInfo with a package name and the module suffixes set
 */
function createPlatformInfo(platform: string, npmName?: string): PlatformInfo {
  const pkgName = npmName || fallbackPackages[platform];
  if (!pkgName) {
    throw new Error(
      `Unable to determine package name for platform ${platform}`
    );
  }
  return {
    name: platform,
    pkgName: npmName || fallbackPackages[platform],
    suffixes: platformExtensions(platform)
      .concat("")
      .map((s) => `.${s}`),
  };
}

/**
 * This determines supported react native platforms for a package given the bundle config if it is marked as an app
 * @returns an array of react-native platforms that the package supports
 */
export function platformsFromKitConfig(
  kitConfig: KitConfig | undefined
): string[] | undefined {
  const found = new Set<string>();
  if (kitConfig?.kitType === "app") {
    // for packages marked as an 'app', determine available platforms based on the bundle configuration
    for (const bundleConfig of coerceArray(kitConfig.bundle)) {
      const { platforms, targets } = bundleConfig || {};
      if (platforms) {
        for (const platform in platforms) {
          found.add(platform);
        }
      }
      for (const target of coerceArray(targets)) {
        found.add(target);
      }
    }
  }
  return found.size > 0 ? Array.from(found) : undefined;
}

/**
 * Load platform info for available platforms for a given package
 *
 * @param pkgRoot the root directory of the package
 * @param manifest the loaded package manifest
 * @param platformOverride override platform detection with a specific set of platforms
 * @returns a map of platform name to PlatformInfo
 */
export function loadPackagePlatformInfo(
  pkgRoot: string,
  manifest: PackageManifest,
  platformOverride?: string[]
): Record<string, PlatformInfo> {
  // load the available platforms for the package from the react-native config files (and dependencies)
  const available = getAvailablePlatforms(pkgRoot);

  // the platforms are set specifically, found in the kit config, or equal all available platforms
  const platforms =
    platformOverride ||
    platformsFromKitConfig(
      getKitConfigFromPackageManifest(manifest, pkgRoot)
    ) ||
    Object.keys(available);
  const result: Record<string, PlatformInfo> = {};

  for (const platform of platforms) {
    result[platform] = createPlatformInfo(platform, available[platform]);
  }
  return result;
}

export function parseFileReference(
  file: string,
  extensions: Set<string>,
  ignoreSuffix?: boolean
): ParsedFileReference {
  let ext = path.extname(file);
  let suffix = "";
  let base = file;

  if (extensions.has(ext)) {
    if (ext === ".ts" || ext === ".tsx") {
      const dtsExt = ".d" + ext;
      if (extensions.has(dtsExt) && file.endsWith(dtsExt)) {
        ext = dtsExt;
      }
    }
    base = base.slice(0, -ext.length);
    suffix = path.extname(base);
  } else {
    suffix = ext;
    ext = "";
  }

  if (suffix && !ignoreSuffix) {
    base = base.slice(0, -suffix.length);
  } else {
    suffix = "";
  }

  return { base, ext, suffix };
}

/**
 * Standard source file extensions. The reason this is a discrete list rather than allowing all extensions
 * is that the references being parsed can be in ./folder/file.js or ./folder/file format, depending on how they
 * are declared. We want to parse both and don't want to accidentally treat ./folder/file.types as having an
 * extension of .types
 */
const sourceExtensions = new Set([
  ".js",
  ".jsx",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".d.ts",
  ".d.tsx",
  ".json",
]);

/**
 * Take a file path and return the base file name, the platform extension if one exists, and the file extension.
 *
 * @param file file path to parse, can be a source file (./src/foo.js) or a module style reference (./src/foo)
 * @param ignoreSuffix don't split out the module suffix, leaving it attached to the base
 * @returns an object with the base file name, the platform extension if one exists, and the file extension
 */
export function parseSourceFileReference(
  file: string,
  ignoreSuffix?: boolean
): ParsedFileReference {
  return parseFileReference(file, sourceExtensions, ignoreSuffix);
}

export type FileEntry = {
  file: string;
  suffix?: string;
  allSuffixes: Set<string>;
  built?: boolean;
};

/**
 * @returns true if this file is the best match for this platform. if file.android.ts and file.ts exist
 * for the android platform it will only return true for file.android.ts, for ios it will return true for file.ts
 */
export function isBestMatch(entry: FileEntry, suffixes: string[]): boolean {
  const { allSuffixes, suffix } = entry;
  // best suffix will be the first found one in the list or undefined if the base file
  const bestSuffix = allSuffixes && suffixes.find((s) => allSuffixes.has(s));

  // it's the best match if the strings match or if they are both undefined
  return suffix === bestSuffix || (!suffix && !bestSuffix);
}

/**
 * Parse the list of files, splitting out suffixes, and create a suffix lookup shared by files with the same
 * base file name. This is used to determine the best match for a platform.
 * @returns a match array of FileEntry structures
 */
function processFileList(files: string[]): FileEntry[] {
  const lookup = new Map<string, Set<string>>();

  const ensureSuffixes = (base: string) => {
    return lookup.get(base) || lookup.set(base, new Set<string>()).get(base)!;
  };

  return files.map((file) => {
    const { base, suffix } = parseSourceFileReference(file);
    const allSuffixes = ensureSuffixes(base);
    if (suffix) {
      allSuffixes.add(suffix);
    }
    return { file, suffix, allSuffixes };
  });
}

/**
 * Given the parsed file entries, go through adding the files to the task based on the platform.
 * @param files processed file entry list
 * @param isDefaultTask is this the task which should build any unbuilt files
 * @param context task to add files to
 */
function addFilesToContext(
  files: FileEntry[],
  isDefaultTask: boolean,
  context: BuildContext
) {
  const fileNames: string[] = [];

  const { suffixes = [] } = context.platform || {};

  // if we are in checkOnly mode then task.build will be null and we will fall back to the check array
  const pushToBuild = (file: string, checkOnly: boolean) => {
    if (context.build && !checkOnly) {
      context.build.push(file);
    } else {
      context.check?.push(file);
    }
    fileNames.push(file);
  };

  for (const entry of files) {
    const bestMatch = isBestMatch(entry, suffixes);
    if (!entry.built && (bestMatch || isDefaultTask)) {
      pushToBuild(entry.file, false);
      entry.built = true;
    } else if (bestMatch) {
      pushToBuild(entry.file, true);
    }
  }
  // update the file names used to create the typescript project
  context.cmdLine.fileNames = fileNames;
}

function copyParsedCmdLine(
  cmdLine: ts.ParsedCommandLine
): ts.ParsedCommandLine {
  return {
    ...cmdLine,
    options: { ...cmdLine.options },
    fileNames: [...cmdLine.fileNames],
  };
}

/**
 * Take the generic build context and create one for each platform, setting up the files to build for each platform.
 * @param context starting build context with the information about how the command was set up
 * @returns one or more build contexts, one for each platform
 */
export function multiplexForPlatforms(
  context: BuildContext,
  platforms?: PlatformInfo[]
): BuildContext[] {
  const { cmdLine, reporter, writer, root } = context;
  const checkOnly = Boolean(cmdLine.options.noEmit);
  // no platforms then we have nothing to do
  if (!platforms || platforms.length === 0) {
    context.platform = undefined;
    context.check = checkOnly ? cmdLine.fileNames : [];
    context.build = checkOnly ? [] : cmdLine.fileNames;
    return [context];
  }

  // set up the tasks for each platform, build array is undefined in checkOnly mode
  const tasks: BuildContext[] = platforms.map((platform) => {
    return {
      root,
      cmdLine: copyParsedCmdLine(cmdLine),
      platform,
      build: checkOnly ? undefined : [],
      check: [],
      reporter: reporter.createSubReporter(platform.name),
      writer,
    };
  });

  // parse the files into file entries with suffixes already split out
  const entries = processFileList(cmdLine.fileNames);

  // now iterate through the tasks in reverse order setting the default task as last
  for (let i = tasks.length - 1; i >= 0; i--) {
    addFilesToContext(entries, i === 0, tasks[i]);
  }

  return tasks;
}
