import { error } from "@rnx-kit/console";
import { resolveCapabilities } from "./capabilities";
import { checkPackageManifest } from "./check";
import { readJsonFile, writeJsonFile } from "./json";
import { updateDependencies } from "./manifest";
import { parseProfilesString } from "./profiles";
import { isString, keysOf } from "./helpers";
import type { Command, PackageManifest, ResolverOptions } from "./types";

type Change = {
  name: string;
  from: string;
  to: string;
  section: string;
};

type Options = {
  versions: string | number;
  write: boolean;
  customProfilesPath?: string | number;
  excludePackages?: string | number;
};

const allSections = [
  "dependencies" as const,
  "peerDependencies" as const,
  "devDependencies" as const,
];

export function buildManifestProfile(
  versions: string | number,
  customProfilesPath: string | number | undefined,
  options?: ResolverOptions
): Required<PackageManifest> {
  const { supportedProfiles, targetProfile } = parseProfilesString(
    versions,
    customProfilesPath,
    options
  );

  const allCapabilities = keysOf(targetProfile[0]);

  // Use "development" type so we can check for devOnly packages under
  // `dependencies` as well.
  const directDependencies = updateDependencies(
    {},
    resolveCapabilities(allCapabilities, targetProfile),
    "development"
  );

  const { name, version } = require("../package.json");
  return {
    name,
    version,
    dependencies: directDependencies,
    peerDependencies: updateDependencies(
      {},
      resolveCapabilities(allCapabilities, supportedProfiles),
      "peer"
    ),
    devDependencies: directDependencies,
  };
}

export function inspect(
  manifest: PackageManifest,
  profile: Required<PackageManifest>,
  write: boolean
): Change[] {
  const changes: Change[] = [];
  allSections.forEach((section) => {
    const dependencies = manifest[section];
    if (!dependencies) {
      return;
    }

    const desiredDependencies = profile[section];
    Object.keys(dependencies).forEach((name) => {
      if (name in desiredDependencies) {
        const from = dependencies[name];
        const to = desiredDependencies[name];
        if (from !== to) {
          changes.push({ name, from, to, section });
          if (write) {
            dependencies[name] = to;
          }
        }
      }
    });
  });
  return changes;
}

export function makeVigilantCommand({
  customProfilesPath,
  excludePackages,
  versions,
  write,
}: Options): Command | undefined {
  if (!versions) {
    error("A comma-separated list of profile versions must be specified.");
    return undefined;
  }

  const uncheckedReturnCode = -1;
  const checkOptions = { uncheckedReturnCode, write };

  const exclusionList = isString(excludePackages)
    ? excludePackages.split(",")
    : [];

  const profile = buildManifestProfile(versions, customProfilesPath);
  return (manifestPath: string) => {
    try {
      const checkReturnCode = checkPackageManifest(manifestPath, checkOptions);
      if (checkReturnCode !== uncheckedReturnCode) {
        return checkReturnCode;
      }
    } catch (_) {
      // Ignore; retry with a full inspection
    }

    const manifest = readJsonFile(manifestPath);
    if (exclusionList.includes(manifest.name)) {
      return 0;
    }

    const changes = inspect(manifest, profile, write);
    if (changes.length > 0) {
      if (write) {
        writeJsonFile(manifestPath, manifest);
      } else {
        const violations = changes
          .map(
            ({ name, from, to, section }) =>
              `    ${name} "${from}" -> "${to}" (${section})`
          )
          .join("\n");
        error(
          `Found ${changes.length} violation(s) in ${manifest.name}:\n${violations}`
        );
        return 1;
      }
    }
    return 0;
  };
}
