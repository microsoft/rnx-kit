import { expandPlatformExtensions } from "@rnx-kit/tools-react-native";
import type { Plugin } from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Base JS file extensions that esbuild will try, in prioritized order.
 */
const BASE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

/**
 * Checks whether the given path refers to a directory that contains a
 * `package.json` file.
 */
function isPackageDir(p: string): boolean {
  return fs.existsSync(path.join(p, "package.json"));
}

/**
 * Reads the `react-native` or `main` field from a `package.json` file.
 *
 * Metro (and the React Native ecosystem) prioritises the `react-native` field
 * in `package.json` over the standard `main` field so that packages can ship
 * source files or non-CommonJS builds specifically for React Native.
 */
function getPackageMainField(
  pkgDir: string,
  mainFields: readonly string[]
): string | undefined {
  const pkgJsonPath = path.join(pkgDir, "package.json");
  try {
    const manifest = JSON.parse(
      fs.readFileSync(pkgJsonPath, { encoding: "utf-8" })
    );
    for (const field of mainFields) {
      const value = manifest[field];
      if (typeof value === "string" && value) {
        return value;
      }
    }
  } catch (_) {
    // ignore
  }
  return undefined;
}

/**
 * Attempts to resolve `filePath` by trying platform-specific extensions first,
 * then falling back to base extensions.
 *
 * @example
 * For `platform = "ios"` the order tried is:
 *   `<path>.ios.tsx`, `<path>.ios.ts`, `<path>.ios.jsx`, `<path>.ios.js`,
 *   `<path>.native.tsx`, `<path>.native.ts`, `<path>.native.jsx`, `<path>.native.js`,
 *   `<path>.tsx`, `<path>.ts`, `<path>.jsx`, `<path>.js`
 */
function tryResolveFile(
  filePath: string,
  platform: string
): string | undefined {
  const extensions = expandPlatformExtensions(platform, BASE_EXTENSIONS);
  for (const ext of extensions) {
    const candidate = filePath + ext;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Resolves a bare module specifier (e.g. `react-native`) to an absolute path,
 * applying React Native field priority and platform extension logic.
 */
function resolvePackage(
  moduleName: string,
  resolveDir: string,
  platform: string,
  mainFields: readonly string[]
): string | undefined {
  // Use Node's require.resolve to find the package directory
  let pkgJsonPath: string | undefined;
  try {
    pkgJsonPath = require.resolve(`${moduleName}/package.json`, {
      paths: [resolveDir],
    });
  } catch (_) {
    try {
      // Some packages don't have an explicit package.json export — try to
      // locate it by resolving the package's index file and walking up.
      const main = require.resolve(moduleName, { paths: [resolveDir] });
      let dir = path.dirname(main);
      while (dir !== path.dirname(dir)) {
        if (isPackageDir(dir)) {
          pkgJsonPath = path.join(dir, "package.json");
          break;
        }
        dir = path.dirname(dir);
      }
    } catch (_) {
      // ignore
    }
  }

  if (!pkgJsonPath) {
    return undefined;
  }

  const pkgDir = path.dirname(pkgJsonPath);
  const mainField = getPackageMainField(pkgDir, mainFields);
  if (!mainField) {
    return undefined;
  }

  const mainPath = path.resolve(pkgDir, mainField);

  // First try the exact path from the main field.
  if (fs.existsSync(mainPath)) {
    return mainPath;
  }

  // Then try adding platform/base extensions.
  return tryResolveFile(mainPath, platform);
}

/**
 * An esbuild plugin that replicates React Native's module resolution strategy:
 *
 * 1. **Platform-specific file extensions** — when resolving a file `foo`, it
 *    tries (for `platform = "ios"`) `foo.ios.ts`, `foo.ios.tsx`, `foo.ios.js`,
 *    `foo.native.ts`, `foo.native.tsx`, `foo.native.js`, and then the plain
 *    equivalents, before deferring to esbuild's built-in resolver.
 *
 * 2. **`react-native` field in `package.json`** — when resolving a package
 *    `react-native` relies on (e.g. `react-native` itself, or community
 *    packages that ship a React Native–specific entry), the resolver checks the
 *    `react-native` field in `package.json` before the standard `main` field.
 *    The precedence order mirrors Metro's default `resolverMainFields`:
 *    `react-native` → `module` → `browser` → `main`.
 *
 * Parts of Metro that this plugin **replaces**:
 * - `metro-resolver` – the core module resolution logic.
 * - Platform-extension expansion from `metro-config`'s default resolver
 *   configuration.
 *
 * Parts of Metro that esbuild handles **natively** (no plugin required):
 * - TypeScript / JSX transformation.
 * - Module bundling and dependency graph construction.
 * - Tree-shaking (dead code elimination).
 * - Minification.
 * - Source-map generation.
 *
 * Parts of Metro that **cannot** be replaced by esbuild (out of scope):
 * - Dev server with Hot Module Replacement (HMR).
 * - RAM bundle (indexed bundle) format.
 * - Lazy module loading.
 *
 * @param platform The target React Native platform.
 * @param mainFields The `package.json` fields to check in priority order.
 *   Defaults to `["react-native", "module", "browser", "main"]`, which
 *   matches Metro's default resolver configuration.
 */
export function reactNativeResolver(
  platform: string,
  mainFields: readonly string[] = ["react-native", "module", "browser", "main"]
): Plugin {
  return {
    name: "@rnx-kit/esbuild-service:react-native-resolver",
    setup(build) {
      // Intercept ALL resolution attempts so we can check for platform-specific
      // file variants before esbuild's default resolver runs.
      build.onResolve({ filter: /.*/ }, (args) => {
        const { path: importPath, resolveDir, kind } = args;

        // Skip esbuild internals and data URIs.
        if (
          !resolveDir ||
          importPath.startsWith("data:") ||
          importPath.startsWith("<")
        ) {
          return undefined;
        }

        // Skip absolute paths – esbuild handles them fine and we'd just need to
        // replicate the same platform extension logic which is covered below for
        // relative imports.
        if (path.isAbsolute(importPath)) {
          // Still apply platform extension expansion for absolute paths.
          const resolved = tryResolveFile(importPath, platform);
          if (resolved) {
            return { path: resolved };
          }
          if (fs.existsSync(importPath)) {
            return { path: importPath };
          }
          return undefined;
        }

        // Relative import (./foo, ../bar) – apply platform extension expansion.
        if (importPath.startsWith(".")) {
          const base = path.resolve(resolveDir, importPath);

          // If it already resolves to a real file, let esbuild handle it.
          if (fs.existsSync(base) && !fs.statSync(base).isDirectory()) {
            return undefined;
          }

          // Try platform-specific and base extensions.
          const resolved = tryResolveFile(base, platform);
          if (resolved) {
            return { path: resolved };
          }

          // Try index file inside a directory.
          if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
            const indexResolved = tryResolveFile(
              path.join(base, "index"),
              platform
            );
            if (indexResolved) {
              return { path: indexResolved };
            }
          }

          // Fall through to esbuild's default resolver.
          return undefined;
        }

        // Bare module specifier – apply react-native field priority.
        // Only intercept if the entry kind is an import/require (not a
        // dynamic-import-related resolution that esbuild handles internally).
        if (
          kind === "import-statement" ||
          kind === "require-call" ||
          kind === "dynamic-import" ||
          kind === "import-rule"
        ) {
          const resolved = resolvePackage(
            importPath,
            resolveDir,
            platform,
            mainFields
          );
          if (resolved) {
            return { path: resolved };
          }
        }

        // Fall through to esbuild's default resolver.
        return undefined;
      });
    },
  };
}
