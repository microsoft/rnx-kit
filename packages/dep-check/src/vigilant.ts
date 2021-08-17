import type { Capability } from "@rnx-kit/config";
import { error } from "@rnx-kit/console";
import type { PackageManifest } from "@rnx-kit/tools";
import fs from "fs";
import semver from "semver";
import { resolveCapabilities } from "./capabilities";
import { checkPackageManifest } from "./check";
import { updateDependencies } from "./manifest";
import { getProfilesFor } from "./profiles";
import type { Command, ManifestProfile, ResolverOptions } from "./types";

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
): ManifestProfile {
  const profileVersions = versions
    .toString()
    .split(",")
    .map((value) => "^" + semver.coerce(value));

  const supportedProfiles = getProfilesFor(
    profileVersions.join(" || "),
    customProfilesPath?.toString(),
    options
  );

  const targetProfile = getProfilesFor(
    profileVersions[0],
    customProfilesPath?.toString(),
    options
  );

  const allCapabilities = Object.keys(targetProfile[0]) as Capability[];

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
  profile: ManifestProfile,
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

  const exclusionList =
    typeof excludePackages === "string" ? excludePackages.split(",") : [];

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

    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, { encoding: "utf-8" })
    );
    if (exclusionList.includes(manifest.name)) {
      return 0;
    }

    const changes = inspect(manifest, profile, write);
    if (changes.length > 0) {
      if (write) {
        fs.writeFileSync(
          manifestPath,
          JSON.stringify(manifest, undefined, 2) + "\n"
        );
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
