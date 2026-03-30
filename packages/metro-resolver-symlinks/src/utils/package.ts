import { findPackageDependencyDir } from "@rnx-kit/tools-node/package";

export type SupportedResolver = "enhanced-resolve" | "oxc-resolver";

export function importResolver(
  moduleName: "enhanced-resolve"
): typeof import("enhanced-resolve");

export function importResolver(
  moduleName: "oxc-resolver"
): typeof import("oxc-resolver");

export function importResolver(moduleName: SupportedResolver) {
  switch (moduleName) {
    case "enhanced-resolve":
      return require("enhanced-resolve");
    case "oxc-resolver":
      return require("oxc-resolver");
  }
}

export function resolveFrom(
  moduleName: string,
  startDir: string
): string | undefined {
  return findPackageDependencyDir(moduleName, {
    startDir,
    resolveSymlinks: true,
  });
}
