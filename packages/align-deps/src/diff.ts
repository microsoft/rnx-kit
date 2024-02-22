import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { dependencySections } from "./helpers";
import semverSatisfies from "semver/functions/satisfies";
import type { Changes } from "./types";

export type DiffMode = "strict" | "allow-exact-version";

export function diff(
  manifest: PackageManifest,
  updatedManifest: PackageManifest,
  mode: DiffMode = "strict"
): Changes | undefined {
  const allChanges: Changes = {
    dependencies: [],
    peerDependencies: [],
    devDependencies: [],
    capabilities: [],
  };

  const allowExactVersion = mode === "allow-exact-version";
  const numChanges = dependencySections.reduce((count, section) => {
    const changes = allChanges[section];
    const currentDeps = manifest[section] ?? {};
    const updatedDeps = updatedManifest[section] ?? {};

    for (const [dependency, target] of Object.entries(updatedDeps)) {
      const current = currentDeps[dependency];
      if (!current) {
        changes.push({ type: "added", dependency, target });
      } else if (current !== target) {
        if (!allowExactVersion || !semverSatisfies(current, target)) {
          changes.push({ type: "changed", dependency, target, current });
        }
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
  const prefix = "\t  - ";

  for (const [section, changes] of Object.entries(allChanges)) {
    if (changes.length > 0) {
      output.push(`\tIn ${section}:`);
      for (const change of changes) {
        const { type, dependency } = change;
        switch (type) {
          case "added":
            output.push(`${prefix}${dependency} "${change.target}" is missing`);
            break;
          case "changed":
            output.push(
              `${prefix}${dependency} "${change.current}" should be "${change.target}"`
            );
            break;
          case "removed":
            output.push(`${prefix}${dependency} should be removed`);
            break;
          case "unmanaged":
            output.push(
              `${prefix}${dependency} can be managed by '${change.capability}'`
            );
            break;
        }
      }
    }
  }

  return output.join("\n");
}
