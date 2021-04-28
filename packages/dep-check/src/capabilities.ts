import type { Capability } from "@rnx-kit/config";
import type { Package, Profile } from "./types";

export function resolveCapabilities(
  capabilities: Capability[],
  profiles: Profile[]
): Record<string, Package[]> {
  const unresolvedCapabilities: string[] = [];
  const packages = capabilities.reduce<Record<string, Package[]>>(
    (dependencies, capability) => {
      profiles.forEach((profile) => {
        const pkg = profile[capability];
        if (!pkg) {
          unresolvedCapabilities.push(capability);
          return;
        }

        const { name, version } = pkg;
        if (name in dependencies) {
          const versions = dependencies[name];
          if (!versions.find((current) => current.version === version)) {
            versions.push(pkg);
          }
        } else {
          dependencies[name] = [pkg];
        }
      });
      return dependencies;
    },
    {}
  );

  if (unresolvedCapabilities.length > 0) {
    const message = unresolvedCapabilities.reduce(
      (lines, capability) => (lines += `\n    ${capability}`),
      "The following capabilities could not be resolved for one or more profiles:"
    );

    console.warn(message);
  }

  return packages;
}
