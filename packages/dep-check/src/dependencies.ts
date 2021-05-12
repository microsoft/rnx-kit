import {
  Capability,
  getKitCapabilities,
  getKitConfig,
  KitConfig,
  KitType,
} from "@rnx-kit/config";
import findUp from "find-up";
import fs from "fs";
import path from "path";
import { error, warn } from "./console";
import {
  getProfileVersionsFor,
  profilesSatisfying,
  ProfileVersion,
} from "./profiles";
import type { PackageManifest } from "./types";

type Requirements = Required<
  Pick<KitConfig, "reactNativeVersion" | "capabilities">
>;

type Trace = {
  module: string;
  reactNativeVersion: string;
  profiles: ProfileVersion[];
};

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
  kitType: KitType,
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
  if (kitType === "app") {
    const trace: Trace[] = [
      {
        module: targetManifest.name,
        reactNativeVersion: targetReactNativeVersion,
        profiles: profileVersions,
      },
    ];

    visitDependencies(targetManifest, projectRoot, (module, modulePath) => {
      const kitConfig = getKitConfig({ cwd: modulePath });
      if (kitConfig) {
        const { reactNativeVersion, capabilities } =
          getKitCapabilities(kitConfig);

        profileVersions = profilesSatisfying(
          profileVersions,
          reactNativeVersion
        );
        if (profileVersions.length != trace[trace.length - 1].profiles.length) {
          trace.push({ module, reactNativeVersion, profiles: profileVersions });
        }

        if (profileVersions.length === 0) {
          const message =
            "No React Native profile could satisfy all dependencies";
          const fullTrace = [
            message,
            ...trace.map(({ module, reactNativeVersion, profiles }) => {
              const satisfiedVersions = profiles.join(", ");
              return `    [${satisfiedVersions}] satisfies '${module}' because it supports '${reactNativeVersion}'`;
            }),
          ].join("\n");
          error(fullTrace);
          throw new Error(message);
        }

        if (Array.isArray(capabilities)) {
          capabilities.reduce((result, capability) => {
            result.add(capability);
            return result;
          }, allCapabilities);
        }
      }
    });
  }

  return {
    reactNativeVersion: "^" + profileVersions.join(" || ^"),
    capabilities: Array.from(allCapabilities),
  };
}
