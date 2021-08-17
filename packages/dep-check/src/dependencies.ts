import {
  Capability,
  getKitCapabilities,
  getKitConfig,
  KitConfig,
  KitType,
} from "@rnx-kit/config";
import { error, warn } from "@rnx-kit/console";
import findUp from "find-up";
import path from "path";
import { concatVersionRanges } from "./helpers";
import { readJsonFile } from "./json";
import {
  getProfilesFor,
  getProfileVersionsFor,
  profilesSatisfying,
} from "./profiles";
import type {
  PackageManifest,
  Profile,
  ProfileVersion,
  ResolverOptions,
} from "./types";

type Requirements = Required<
  Pick<KitConfig, "reactNativeVersion" | "capabilities">
>;

type Trace = {
  module: string;
  reactNativeVersion: string;
  profiles: ProfileVersion[];
};

function isCoreCapability(capability: Capability): boolean {
  return capability.startsWith("core-");
}

function isDevOnlyCapability(
  capability: Capability,
  profiles: Partial<Profile>[]
): boolean {
  return profiles.some((profile) => profile[capability]?.devOnly);
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

    const manifest = readJsonFile(packageJson);
    visitDependencies(manifest, packageRoot, visitor, visited);
  });
}

export function getRequirements(
  targetReactNativeVersion: string,
  kitType: KitType,
  targetManifest: PackageManifest,
  projectRoot: string,
  customProfiles: string | undefined,
  options?: ResolverOptions
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
          capabilities.forEach((capability) => allCapabilities.add(capability));
        }
      }
    });

    const profiles = getProfilesFor(profileVersions, customProfiles, options);
    allCapabilities.forEach((capability) => {
      /**
       * Core capabilities are capabilities that must always be declared by the
       * hosting app and should not be included when gathering requirements.
       * This is to avoid forcing an app to install dependencies it does not
       * need, e.g. `react-native-windows` when the app only supports iOS.
       */
      if (
        isCoreCapability(capability) ||
        isDevOnlyCapability(capability, profiles)
      ) {
        allCapabilities.delete(capability);
      }
    });
  }

  return {
    reactNativeVersion: concatVersionRanges(profileVersions),
    capabilities: Array.from(allCapabilities),
  };
}
