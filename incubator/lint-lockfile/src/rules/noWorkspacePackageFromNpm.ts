import type { NoWorkspacePackageFromNpmRuleOptions as Options } from "@rnx-kit/config/lint.types";
import type { Rule } from "../types.ts";

export function noWorkspacePackageFromNpmRule(
  options: Options = {}
): void | Rule {
  if (options.enabled === false) {
    return;
  }

  return (context, key, pkg) => {
    if (
      context.packages.includes(pkg.package) &&
      pkg.resolution !== "0.0.0-use.local"
    ) {
      context.report(`${key}: resolved to ${pkg.resolution}`);
    }
  };
}
