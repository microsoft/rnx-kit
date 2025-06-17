import type { Rule, RuleBaseOptions } from "../types.ts";

export type RuleOptions = RuleBaseOptions;

export function noWorkspacePackageFromNpmRule(
  options: RuleOptions = {}
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
