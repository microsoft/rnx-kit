import type { Rule } from "../types.ts";

export function useWorkspacePackageRule(): Rule {
  return (context, key, pkg) => {
    if (
      context.packages.includes(pkg.package) &&
      pkg.resolution !== "0.0.0-use.local"
    ) {
      context.report(`${key}: resolved to ${pkg.resolution}`);
    }
  };
}
