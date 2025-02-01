import {
  getKitConfigFromPackageManifest,
  type KitConfig,
} from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node";
import {
  getAvailablePlatforms,
  platformExtensions,
} from "@rnx-kit/tools-react-native";
import type ts from "typescript";
import type { BuildContext, ParsedFileName, PlatformInfo } from "./types";

// quick helper for converting a value to an array
function coerceArray<T>(value: T | T[] | undefined): T[] {
  return value ? (Array.isArray(value) ? value : [value]) : [];
}

/**
 * @returns a PlatformInfo with a package name and the module suffixes set
 */
function createPlatformInfo(platform: string, npmName?: string): PlatformInfo {
  // a list of built-in platforms to use as a fallback
  const fallbackPackages: Record<string, string> = {
    android: "react-native",
    ios: "react-native",
    macos: "react-native-macos",
    win32: "@office-iss/react-native-win32",
    windows: "react-native-windows",
    visionos: "@callstack/react-native-visionos",
  };
  return {
    name: platform,
    pkgName: npmName || fallbackPackages[platform] || "",
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
  const foundPlatforms: Record<string, boolean> = {};
  if (kitConfig && kitConfig.kitType === "app") {
    // for packages marked as an 'app', determine available platforms based on the bundle configuration
    coerceArray(kitConfig.bundle).forEach((bundleConfig) => {
      const { platforms, targets } = bundleConfig || {};
      if (platforms) {
        for (const platform in platforms) {
          foundPlatforms[platform] = true;
        }
      }
      coerceArray(targets).forEach((target) => {
        foundPlatforms[target] = true;
      });
    });
  }
  const platforms = Object.keys(foundPlatforms);
  return platforms.length > 0 ? platforms : undefined;
}

export function loadPkgPlatformInfo(
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

/**
 * Take a file path and return the base file name, the platform extension if one exists, and the file extension.
 * @param file file path to parse
 * @param withSuffix parse the potential module suffix from the file name as well
 * @returns an object with the base file name, the platform extension if one exists, and the file extension
 */
export function parseSourceFileDetails(
  file: string,
  ignoreSuffix?: boolean
): ParsedFileName {
  // valid last extensions, will manually check for .d.ts and .d.tsx
  const validExtensions = [".js", ".jsx", ".ts", ".tsx", ".json"];
  const match = /^(.*?)(\.[^./\\]+)?(\.[^./\\]+)?(\.[^./\\]+)?$/
    .exec(file)
    ?.slice(1)
    .filter((s) => s);

  const result: ParsedFileName = { base: file };
  if (match && match.length > 1) {
    if (validExtensions.includes(match[match.length - 1])) {
      result.ext = match.pop();
      if (
        match.length > 1 &&
        match[match.length - 1] === ".d" &&
        result.ext?.startsWith(".ts")
      ) {
        result.ext = match.pop() + result.ext;
      }
    }
    // if there is an extra term treat it as the suffix
    if (match.length > 1 && !ignoreSuffix) {
      result.suffix = match.pop();
    }
    result.base = match.join("");
  }
  return result;
}

export type FoundSuffixes = Record<string, boolean>;
export type FileEntry = {
  file: string;
  suffix?: string;
  allSuffixes: FoundSuffixes;
  built?: boolean;
};

/**
 * @returns true if this file is the best match for this platform. if file.android.ts and file.ts exist
 * for the android platform it will only return true for file.android.ts, for ios it will return true for file.ts
 */
export function isBestMatch(entry: FileEntry, suffixes: string[]): boolean {
  const { allSuffixes, suffix } = entry;
  // best suffix will be the first found one in the list or undefined if the base file
  const bestSuffix = allSuffixes && suffixes.find((s) => allSuffixes[s]);

  // it's the best match if the strings match or if they are both undefined
  return suffix === bestSuffix || (!suffix && !bestSuffix);
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
    const { base, suffix } = parseSourceFileDetails(file);
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
 * @param context task to add files to
 */
function addFilesToContext(
  files: FileEntry[],
  defaultTask: boolean,
  context: BuildContext
) {
  const fileNames: string[] = [];

  const { suffixes } = context.platform || {};

  // if we are in checkOnly mode then task.build will be null and we will fall back to the check array
  const pushToBuild = (file: string, checkOnly: boolean) => {
    if (context.build && !checkOnly) {
      context.build.push(file);
    } else {
      context.check!.push(file);
    }
    fileNames.push(file);
  };

  for (const entry of files) {
    const bestMatch = isBestMatch(entry, suffixes!);
    if (!entry.built && (bestMatch || defaultTask)) {
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
  const checkOnly = !!cmdLine.options.noEmit;
  // no platforms then we have nothing to do
  if (!platforms || platforms.length === 0) {
    context.platform = platforms?.[0];
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
