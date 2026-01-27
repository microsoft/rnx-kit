import { ExportsGroup, PackageExports, PackageManifest } from "./types.ts";

function isObject<T extends Record<string, unknown>>(
  entry: unknown
): entry is T {
  return entry != null && typeof entry === "object" && !Array.isArray(entry);
}

function ifString(entry?: unknown): string | undefined {
  if (typeof entry === "string") {
    return entry;
  }
  return undefined;
}

/**
 * Extracts the bin entry for the given bin name from the package manifest. If bin is a string,
 * it is a reference to a bin entry matching the package name. (e.g. for eslint it would correspond to eslint).
 * If it is a different name it looks it up in the bin map. (e.g. looking up tsc for typescript).
 *
 * @param manifest package manifest
 * @param binName name of the bin script, defaults to the name of the package
 * @returns the bin entry corresponding to bin name
 */
export function getBinEntry(
  manifest: PackageManifest,
  binName?: string
): string | undefined {
  const { bin, name } = manifest;
  if (typeof bin === "string") {
    return !binName || name === binName ? bin : undefined;
  } else if (binName && typeof bin === "object") {
    return bin[binName];
  }
  return undefined;
}

/**
 * Get a named export entry from the manifest's exports field.
 * @param manifest package manifest
 * @param exportName name of the export entry
 * @returns the export entry corresponding to the export name
 */
export function getExportEntry(
  manifest: PackageManifest,
  exportName: string
): string | ExportsGroup | undefined {
  const exports = manifest.exports;
  if (isObject<PackageExports>(exports)) {
    return exports[exportName];
  }
  return undefined;
}

function topLevelToExportName(
  entryType: "main" | "module" | "browser" | "types"
): string {
  switch (entryType) {
    case "main":
      return "require";
    case "module":
      return "import";
    default:
      return entryType;
  }
}

/**
 * Get the entry point for the given entry type from the package manifest.
 * @param manifest package manifest
 * @param entryType type of the entry point ("main", "module", "browser", or "types")
 * @param exportName name of the export entry
 * @returns the entry point corresponding to the entry type and export name
 */
export function getEntryPoint(
  manifest: PackageManifest,
  entryType: "main" | "module" | "browser" | "types",
  exportName?: string
): string | undefined {
  let entryPoint: string | undefined = undefined;

  // let exports take precedence
  const exportEntry = getExportEntry(manifest, exportName ?? ".");
  if (isObject<ExportsGroup>(exportEntry)) {
    entryPoint = ifString(exportEntry[topLevelToExportName(entryType)]);
    if (!entryPoint && (entryType === "main" || entryType === "module")) {
      // Fallback to default for main/module if specific entry is not found
      entryPoint = ifString(exportEntry["default"]);
    }
  }

  // otherwise, fall back to top-level fields
  if (!entryPoint) {
    entryPoint = ifString(manifest[entryType]);
  }
  if (!entryPoint && entryType === "types") {
    // @deprecated fallback
    entryPoint = ifString(manifest["typings"]);
  }
  return entryPoint;
}
