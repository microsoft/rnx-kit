import { Capability, getKitConfig, KitConfig } from "@rnx-kit/config";
import findUp from "find-up";
import fs from "fs";
import path from "path";
import semver from "semver";
import { warn } from "./console";
import { allProfiles } from "./profiles";
import type { PackageManifest } from "./types";

type Requirements = Required<
  Pick<KitConfig, "reactNativeVersion" | "capabilities">
>;

const VERSION_POSTFIX = ".9999";

export function intersection(
  versions: string[],
  versionOrRange: string
): string[] | null {
  const versionRange = semver.valid(versionOrRange)
    ? "~" + versionOrRange
    : semver.validRange(versionOrRange);
  if (versionRange) {
    const intersection = versions.filter((version) =>
      semver.satisfies(version, versionRange)
    );
    if (intersection.length > 0) {
      return intersection;
    }
  }

  return null;
}

export function targetReactNativeVersions(): string[] {
  return Object.keys(allProfiles).map((version) => version + VERSION_POSTFIX);
}

export function visitDependencies(
  { dependencies }: PackageManifest,
  projectRoot: string,
  visitor: (module: string, modulePath: string) => void,
  visited: Set<string> = new Set<string>()
): void {
  if (!dependencies) {
    return;
  }

  Object.keys(dependencies).forEach((dependency) => {
    if (visited.has(dependency)) {
      return;
    }

    visited.add(dependency);

    const packageJson = findUp.sync(
      path.join("node_modules", dependency, "package.json"),
      { cwd: projectRoot }
    );
    if (!packageJson) {
      warn(`Unable to resolve module '${dependency}'`);
      return;
    }

    const packageRoot = path.dirname(packageJson);
    visitor(dependency, packageRoot);

    const content = fs.readFileSync(packageJson, { encoding: "utf-8" });
    const manifest: PackageManifest = JSON.parse(content);
    visitDependencies(manifest, packageRoot, visitor, visited);
  });
}

export function getRequirements(
  targetManifest: PackageManifest,
  projectRoot: string
): Requirements {
  let targetVersions = targetReactNativeVersions();
  const allCapabilities = new Set<Capability>();

  visitDependencies(targetManifest, projectRoot, (module, modulePath) => {
    const kitConfig = getKitConfig({ cwd: modulePath });
    if (kitConfig) {
      const { reactNativeVersion, capabilities } = kitConfig;

      if (reactNativeVersion) {
        const versionRange = intersection(targetVersions, reactNativeVersion);
        if (versionRange) {
          targetVersions = versionRange;
        } else {
          warn(
            `Could not satisfy version/range declared by '${module}': ${reactNativeVersion}`
          );
        }
      } else {
        warn(`'${module}' does not declare supported React Native versions`);
      }

      if (Array.isArray(capabilities)) {
        capabilities.reduce((result, capability) => {
          result.add(capability);
          return result;
        }, allCapabilities);
      }
    }
  });

  const reactNativeVersion = targetVersions[targetVersions.length - 1];
  return {
    reactNativeVersion: reactNativeVersion.replace(VERSION_POSTFIX, ".0"),
    capabilities: Array.from(allCapabilities),
  };
}
