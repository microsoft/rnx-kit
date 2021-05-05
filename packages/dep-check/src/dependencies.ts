import {
  Capability,
  getKitCapabilities,
  getKitConfig,
  KitConfig,
} from "@rnx-kit/config";
import findUp from "find-up";
import fs from "fs";
import path from "path";
import { warn } from "./console";
import {
  getProfileVersionsFor,
  profilesSatisfying,
  ProfileVersion,
} from "./profiles";
import type { PackageManifest } from "./types";

type Requirements = Required<
  Pick<KitConfig, "reactNativeVersion" | "capabilities">
>;

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
  targetReactNativeVersion: string,
  targetManifest: PackageManifest,
  projectRoot: string
): Requirements {
  let profileVersions = getProfileVersionsFor(targetReactNativeVersion);
  if (profileVersions.length === 0) {
    throw new Error(
      `No profile could satisfy React Native version: ${targetReactNativeVersion}`
    );
  }

  const allCapabilities = new Set<Capability>();
  const trace: [string, ProfileVersion[]][] = [
    [targetManifest.name, profileVersions],
  ];

  visitDependencies(targetManifest, projectRoot, (module, modulePath) => {
    const kitConfig = getKitConfig({ cwd: modulePath });
    if (kitConfig) {
      const { reactNativeVersion, capabilities } = getKitCapabilities(
        kitConfig
      );

      profileVersions = profilesSatisfying(profileVersions, reactNativeVersion);
      if (profileVersions.length === 0) {
        // TODO: Dump trace
        throw new Error("No profile could satisfy all current dependencies");
      }

      trace.push([module, profileVersions]);

      if (Array.isArray(capabilities)) {
        capabilities.reduce((result, capability) => {
          result.add(capability);
          return result;
        }, allCapabilities);
      }
    }
  });

  return {
    reactNativeVersion: "^" + profileVersions.join(" || ^"),
    capabilities: Array.from(allCapabilities),
  };
}
