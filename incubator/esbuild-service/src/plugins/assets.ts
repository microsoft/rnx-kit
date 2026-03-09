import { findMetroPath } from "@rnx-kit/tools-react-native/metro";
import type { AssetData } from "metro";
import type { Plugin } from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Default asset file extensions that Metro handles as assets (non-JS files
 * that get registered in the React Native asset registry).
 *
 * Source: `metro-config` defaults.
 */
export const DEFAULT_ASSET_EXTS = [
  // Image formats
  "bmp",
  "gif",
  "jpg",
  "jpeg",
  "png",
  "psd",
  "svg",
  "webp",
  "xml",
  // Video formats
  "m4v",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "webm",
  // Audio formats
  "aac",
  "aiff",
  "caf",
  "m4a",
  "mp3",
  "wav",
  // Document formats
  "html",
  "pdf",
  "yaml",
  "yml",
  // Font formats
  "otf",
  "ttf",
  // Archive formats
  "zip",
] as const;

/**
 * Properties that Metro's `generateAssetCodeFileAst()` strips from
 * `AssetData` before registering. We apply the same filter.
 */
const ASSET_PROPERTY_BLOCKLIST = new Set(["files", "fileSystemLocation"]);

/**
 * Signature of Metro's `getAssetData` function (`metro/src/Assets.js`).
 * Defined locally to avoid importing from the un-typed `metro/private/Assets`
 * subpath.
 */
type MetroGetAssetData = (
  assetPath: string,
  localPath: string,
  assetDataPlugins: string[],
  platform: string | null | undefined,
  publicPath: string
) => Promise<AssetData>;

/**
 * Options for the React Native assets esbuild plugin.
 */
export type AssetsPluginOptions = {
  /**
   * Target platform (e.g. `"ios"`, `"android"`).
   */
  platform: string;

  /**
   * Project root directory. Used to compute relative asset paths and to
   * locate Metro.
   */
  projectRoot: string;

  /**
   * The public URL path prefix for assets, used to compute
   * `httpServerLocation`. Defaults to `"/assets"`.
   */
  publicPath?: string;

  /**
   * Path to the React Native asset registry module. esbuild will generate
   * `require(assetRegistryPath).registerAsset(...)` calls for every asset.
   *
   * Defaults to `"react-native/Libraries/Image/AssetRegistry"`.
   */
  assetRegistryPath?: string;

  /**
   * Additional Metro asset data plugins to apply. Each entry is a module path
   * whose default export is a function that receives and transforms `AssetData`.
   */
  assetDataPlugins?: string[];

  /**
   * Asset file extensions to handle. Defaults to {@link DEFAULT_ASSET_EXTS}.
   */
  assetExts?: readonly string[];
};

/**
 * Retrieves Metro's `getAssetData` function from the project's Metro
 * installation. Returns `undefined` if Metro is not installed.
 *
 * This is the "use Metro's code if possible" part: we call into Metro's own
 * asset-data API rather than reimplementing it.
 */
function tryGetMetroAssetData(
  projectRoot: string
): MetroGetAssetData | undefined {
  const metroPath = findMetroPath(projectRoot);
  if (!metroPath) {
    return undefined;
  }
  try {
    // metro/private/* maps to metro/src/* via the package.json exports field:
    // "./private/*": "./src/*.js"
    const assetsModule = require(
      require.resolve("metro/src/Assets", { paths: [metroPath] })
    );
    return assetsModule.getAssetData as MetroGetAssetData;
  } catch (_) {
    return undefined;
  }
}

/**
 * Returns the asset data properties that should be included in the
 * `registerAsset()` call, following the same filter Metro applies
 * in `generateAssetCodeFileAst()`.
 */
function getRegisterableAssetData(
  assetData: AssetData
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(assetData)) {
    if (!ASSET_PROPERTY_BLOCKLIST.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Generates the JavaScript source that Metro's asset transformer emits for a
 * given asset. It is equivalent to the output of Metro's
 * `generateAssetCodeFileAst()`:
 *
 * ```js
 * module.exports = require("react-native/Libraries/Image/AssetRegistry").registerAsset({
 *   __packager_asset: true,
 *   httpServerLocation: "/assets/path/to",
 *   ...
 * });
 * ```
 */
function generateAssetCode(
  assetRegistryPath: string,
  assetData: AssetData
): string {
  const registerable = getRegisterableAssetData(assetData);
  return `module.exports = require(${JSON.stringify(assetRegistryPath)}).registerAsset(${JSON.stringify(registerable)});`;
}

/**
 * An esbuild plugin that handles React Native asset imports (images, fonts,
 * media files, etc.) by:
 *
 * 1. Intercepting imports of files with asset extensions.
 * 2. Calling Metro's own `getAssetData()` function to collect the asset
 *    metadata (file paths, scales, dimensions, hash, etc.).
 * 3. Generating the same `registerAsset(...)` call that Metro's asset
 *    transformer generates, so the asset registry is populated identically
 *    to a Metro bundle.
 * 4. Exposing the collected `AssetData[]` via the `getCollectedAssets()`
 *    method so the caller can copy the files to the output directory.
 *
 * **What this replaces from Metro:**
 * - Metro's asset transformer (`metro-transform-worker`'s `assetTransformer`).
 * - The `assetPlugin` step that transforms asset imports into registry calls.
 *
 * **What this reuses from Metro:**
 * - `getAssetData()` from `metro/src/Assets` — the canonical implementation
 *   that discovers all scale variants (`@2x`, `@3x`), computes the MD5
 *   hash, and reads image dimensions.  If Metro is not installed in the
 *   project, a minimal fallback implementation is used instead.
 *
 * @param options Plugin configuration.
 * @returns An esbuild `Plugin` with an extra `getCollectedAssets()` method.
 */
export function reactNativeAssets(
  options: AssetsPluginOptions
): Plugin & { getCollectedAssets(): readonly AssetData[] } {
  const {
    platform,
    projectRoot,
    publicPath = "/assets",
    assetRegistryPath = "react-native/Libraries/Image/AssetRegistry",
    assetDataPlugins = [],
    assetExts = DEFAULT_ASSET_EXTS,
  } = options;

  const collectedAssets: AssetData[] = [];
  const getAssetData = tryGetMetroAssetData(projectRoot);

  // Build a regex that matches any of the asset extensions.
  const extPattern = assetExts
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const assetFilter = new RegExp(`\\.(${extPattern})$`, "i");

  // Build the esbuild Plugin object with only the two recognised properties
  // (name + setup), then attach getCollectedAssets as a non-enumerable method
  // so that esbuild's option-validation loop does not reject it.
  const plugin: Plugin = {
    name: "@rnx-kit/esbuild-service:react-native-assets",

    setup(build) {
      build.onLoad({ filter: assetFilter }, async (args) => {
        const absolutePath = args.path;
        const relativePath = path.relative(projectRoot, absolutePath);

        let assetData: AssetData;
        if (getAssetData) {
          // Use Metro's own getAssetData() implementation.
          assetData = await getAssetData(
            absolutePath,
            relativePath,
            assetDataPlugins,
            platform,
            publicPath
          );
        } else {
          // Minimal fallback when Metro is not available in the project.
          assetData = await getAssetDataFallback(
            absolutePath,
            relativePath,
            platform,
            publicPath
          );
        }

        collectedAssets.push(assetData);

        return {
          contents: generateAssetCode(assetRegistryPath, assetData),
          loader: "js",
        };
      });
    },
  };

  // Attach getCollectedAssets as a non-enumerable property so that esbuild's
  // plugin-option validation (which iterates enumerable keys) does not reject
  // it as an unknown option.
  Object.defineProperty(plugin, "getCollectedAssets", {
    enumerable: false,
    configurable: true,
    writable: true,
    value(): readonly AssetData[] {
      return collectedAssets;
    },
  });

  return plugin as Plugin & { getCollectedAssets(): readonly AssetData[] };
}

// ---------------------------------------------------------------------------
// Fallback implementation (used when Metro is not installed)
// ---------------------------------------------------------------------------

/**
 * A minimal implementation of Metro's `getAssetData()` for cases where Metro
 * is not installed in the project. It only supports single-scale assets and
 * does not compute image dimensions.
 */
async function getAssetDataFallback(
  absolutePath: string,
  relativePath: string,
  platform: string,
  publicPath: string
): Promise<AssetData> {
  const crypto = await import("node:crypto");

  const dir = path.dirname(absolutePath);
  const ext = path.extname(absolutePath).slice(1);
  const base = path.basename(absolutePath, `.${ext}`);

  // Strip scale suffix from base name if present (e.g. "icon@2x" -> "icon")
  const nameMatch = base.match(/^(.+?)(?:@(\d+(?:\.\d+)?)x)?$/);
  const name = nameMatch ? nameMatch[1] : base;
  const scaleStr = nameMatch?.[2];
  const scale = scaleStr ? parseFloat(scaleStr) : 1;

  // Discover all scale variants in the same directory
  const dirFiles = fs.readdirSync(dir);
  const scales: number[] = [];
  const scaleFiles: string[] = [];

  const platformSuffix = `.${platform}`;
  for (const file of dirFiles.sort()) {
    const fileExt = path.extname(file).slice(1);
    if (fileExt !== ext) {
      continue;
    }
    const fileBase = path.basename(file, `.${fileExt}`);
    // Match e.g. "icon", "icon.ios", "icon@2x", "icon.ios@2x"
    const match = fileBase.match(
      new RegExp(
        `^${escapeRegExp(name)}(?:${escapeRegExp(platformSuffix)})?(?:@(\\d+(?:\\.\\d+)?)x)?$`
      )
    );
    if (!match) {
      continue;
    }
    const s = match[1] ? parseFloat(match[1]) : 1;
    scales.push(s);
    scaleFiles.push(path.join(dir, file));
  }

  if (scales.length === 0) {
    scales.push(scale);
    scaleFiles.push(absolutePath);
  }

  // Compute an MD5 hash of the primary file
  const content = fs.readFileSync(absolutePath);
  const hash = crypto.createHash("md5").update(content).digest("hex");

  // Compute httpServerLocation from the relative directory of the asset
  const relDir = path.dirname(relativePath);
  const httpServerLocation = `${publicPath}/${relDir}`
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");

  return {
    __packager_asset: true,
    fileSystemLocation: dir,
    httpServerLocation,
    hash,
    name,
    type: ext,
    scales,
    files: scaleFiles,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
