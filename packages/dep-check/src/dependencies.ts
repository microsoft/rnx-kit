import type { Capability, KitConfig, KitType } from "@rnx-kit/config";
import { getKitCapabilities, getKitConfig } from "@rnx-kit/config";
import { error, warn } from "@rnx-kit/console";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";
import { concatVersionRanges } from "./helpers";
import {
  getProfilesFor,
  getProfileVersionsFor,
  profilesSatisfying,
} from "./profiles";
import type { CheckOptions, Profile, ProfileVersion } from "./types";

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

    const packageDir = findPackageDependencyDir(dependency, {
      startDir: projectRoot,
      resolveSymlinks: true,
    });
    if (!packageDir) {
      warn(`Unable to resolve module '${dependency}'`);
      return;
    }

    visitor(dependency, packageDir);

    const manifest = readPackage(packageDir);
    visitDependencies(manifest, packageDir, visitor, visited);
  });
}

export function getRequirements(
  targetReactNativeVersion: string,
  kitType: KitType,
  targetManifest: PackageManifest,
  projectRoot: string,
  customProfiles: string | undefined,
  { loose }: Pick<CheckOptions, "loose">
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
      if (!kitConfig?.reactNativeVersion) {
        return;
      }

      const { reactNativeVersion, capabilities } =
        getKitCapabilities(kitConfig);

      const validVersions = profilesSatisfying(
        profileVersions,
        reactNativeVersion
      );
      if (validVersions.length != profileVersions.length) {
        trace.push({
          module,
          reactNativeVersion,
          profiles: validVersions,
        });
      }

      if (Array.isArray(capabilities)) {
        capabilities.forEach((capability) => allCapabilities.add(capability));
      }

      // In strict mode, we want to continue so we can catch all dependencies
      // that cannot be satisfied. Whereas in loose mode, we can ignore them and
      // carry on with the profiles that satisfy the rest.
      if (validVersions.length > 0) {
        profileVersions = validVersions;
      }
    });

    if (trace[trace.length - 1].profiles.length === 0) {
      const message = "No React Native profile could satisfy all dependencies";
      const fullTrace = [
        message,
        ...trace.map(({ module, reactNativeVersion, profiles }) => {
          const satisfiedVersions = profiles.join(", ");
          return `    [${satisfiedVersions}] satisfies '${module}' because it supports '${reactNativeVersion}'`;
        }),
      ].join("\n");
      if (loose) {
        warn(fullTrace);
      } else {
        error(fullTrace);
        throw new Error(message);
      }
    }

    const profiles = getProfilesFor(profileVersions, customProfiles);
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
