import type { Capability } from "@rnx-kit/config";
import fs from "fs";
import semver from "semver";
import { resolveCapabilities } from "./capabilities";
import { error } from "./console";
import { updateDependencies } from "./manifest";
import { getProfilesFor } from "./profiles";
import type { Command, PackageManifest, ResolverOptions } from "./types";

type Change = {
  name: string;
  from: string;
  to: string;
  section: string;
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
  const directDependencies = resolveCapabilities(
    allCapabilities,
    targetProfile
  );

  const { name, version } = require("../package.json");
  return {
    name,
    version,
    dependencies: updateDependencies({}, directDependencies, "direct"),
    peerDependencies: updateDependencies(
      {},
      resolveCapabilities(allCapabilities, supportedProfiles),
      "peer"
    ),
    devDependencies: updateDependencies({}, directDependencies, "development"),
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

export function makeVigilantCommand(
  versions: string | number,
  write: boolean,
  customProfilesPath: string | number | undefined
): Command | undefined {
  const profile = buildManifestProfile(versions, customProfilesPath);
  return (manifestPath: string) => {
    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, { encoding: "utf-8" })
    );
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
              `  ${name} "${from}" -> "${to}" (${section})`
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
