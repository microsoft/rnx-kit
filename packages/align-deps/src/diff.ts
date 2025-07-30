import type { PackageManifest } from "@rnx-kit/tools-node/package";
import semverRangeSubset from "semver/ranges/subset";
import { dependencySections } from "./helpers";
import type { Changes, Options } from "./types";

function isStrictlyEqual(version: string, range: string) {
  return version === range;
}

export function diff(
  manifest: PackageManifest,
  updatedManifest: PackageManifest,
  { diffMode }: Pick<Options, "diffMode">
): Changes | undefined {
  const allChanges: Changes = {
    dependencies: [],
    peerDependencies: [],
    devDependencies: [],
    capabilities: [],
  };

  const satisfies =
    diffMode === "allow-subset" ? semverRangeSubset : isStrictlyEqual;

  const numChanges = dependencySections.reduce((count, section) => {
    const changes = allChanges[section];
    const currentDeps = manifest[section] ?? {};
    const updatedDeps = updatedManifest[section] ?? {};

    for (const [dependency, target] of Object.entries(updatedDeps)) {
      const current = currentDeps[dependency];
      if (!current) {
        changes.push({ type: "added", dependency, target });
      } else if (!satisfies(current, target)) {
        changes.push({ type: "changed", dependency, target, current });
      }
    }

    for (const dependency of Object.keys(currentDeps)) {
      if (!updatedDeps[dependency]) {
        changes.push({ type: "removed", dependency });
      }
    }

    return count + changes.length;
  }, 0);

  return numChanges > 0 ? allChanges : undefined;
}

export function stringify(
  allChanges: Partial<Changes>,
  output: string[] = []
): string {
  let totalChanges = 0;
  for (const [section, changes] of Object.entries(allChanges)) {
    if (changes.length > 0) {
      totalChanges += changes.length;
      for (const change of changes) {
        const { type, dependency } = change;
        const prefix = `      ├── ${section}["${dependency}"]:`;
        switch (type) {
          case "added":
            output.push(
              `${prefix} dependency is missing, expected "${change.target}"`
            );
            break;
          case "changed":
            output.push(
              `${prefix} found "${change.current}", expected "${change.target}"`
            );
            break;
          case "removed":
            output.push(`${prefix} should be removed`);
            break;
          case "unmanaged":
            output.push(`${prefix} can be managed by '${change.capability}'`);
            break;
        }
      }
    }
  }

  if (totalChanges > 0) {
    output.push("      └── Re-run with '--write' to fix them\n");
  }

  return output.join("\n");
}
