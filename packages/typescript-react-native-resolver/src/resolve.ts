import {
  FileModuleRef,
  getMangledPackageName,
  PackageModuleRef,
} from "@rnx-kit/tools-node";
import path from "path";
import ts from "typescript";

import { ExtensionsTypeScript } from "./extension";
import { isTraceEnabled } from "./log";
import { findModuleFile } from "./module";
import { ResolverContext } from "./types";

/**
 * Resolve a module reference within a given package directory.
 *
 * If a module path is given, use that to find the corresponding module
 * file.
 *
 * Otherwise, consult `package.json` for properties which refer to
 * "entry points" within the package (e.g. `types`, `typings` and `main`).
 * If those properties don't resolve the module, then fall back to looking
 * for an "index" file.
 *
 * @param context Resolver context
 * @param packageDir Root of the package which contains the module
 * @param modulePath Optional relative path to the module
 * @param extensions List of allowed file extensions, in order from highest precedence (index 0) to lowest.
 * @returns Resolved module, or `undefined` if resolution fails
 */
export function resolveModule(
  context: ResolverContext,
  packageDir: string,
  modulePath: string | undefined,
  extensions: ts.Extension[]
): ts.ResolvedModuleFull | undefined {
  //  A module path was given. Use that to resolve the module to a file.
  if (modulePath) {
    return findModuleFile(context, packageDir, modulePath, extensions);
  }

  const { host, options } = context;

  const traceEnabled = isTraceEnabled(host, options);

  let module: ts.ResolvedModuleFull | undefined;

  //  No path was given. Try resolving the module using package.json
  //  properties.
  if (traceEnabled) {
    host.trace(`Reading package.json from directory ${packageDir}.`);
  }
  const result = host.readFile(path.join(packageDir, "package.json"));
  if (!result) {
    throw new Error(
      `Failed to read package.json from directory '${packageDir}'`
    );
  }
  const { types, typings, main } = JSON.parse(result);

  //  Only consult 'types' and 'typings' properties when looking for
  //  type files (.d.ts).
  if (extensions.includes(ts.Extension.Dts)) {
    if (typeof types === "string" && types.length > 0) {
      if (traceEnabled) {
        host.trace(`Package has 'types' field '${types}'.`);
      }
      module = findModuleFile(context, packageDir, types, extensions);
    } else if (typeof typings === "string" && typings.length > 0) {
      if (traceEnabled) {
        host.trace(`Package has 'typings' field '${typings}'.`);
      }
      module = findModuleFile(context, packageDir, typings, extensions);
    }
  }
  if (!module && typeof main === "string" && main.length > 0) {
    if (traceEnabled) {
      host.trace(`Package has 'main' field '${main}'.`);
    }
    module = findModuleFile(context, packageDir, main, extensions);
  }

  //  Properties from package.json weren't able to resolve the module.
  //  Try resolving it to an "index" file.
  if (!module) {
    if (traceEnabled) {
      host.trace("Searching for index file.");
    }
    module = findModuleFile(context, packageDir, "index", extensions);
  }

  return module;
}

function findPackageDependencyDir(
  context: ResolverContext,
  ref: PackageModuleRef,
  startDir: string
): string | undefined {
  const { host, options } = context;

  if (isTraceEnabled(host, options)) {
    host.trace(
      `Searching for external package ${
        ref.scope ? ref.scope + "/" + ref.name : ref.name
      } starting in ${startDir}.`
    );
  }

  const suffixDir = path.join("node_modules", ref.scope ?? "", ref.name);

  let searchDir = startDir;
  const { root: searchRoot } = path.parse(searchDir);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const p = path.join(searchDir, suffixDir);
    if (host.directoryExists(p)) {
      return p;
    }
    if (searchDir === searchRoot) {
      return undefined;
    }
    searchDir = path.dirname(searchDir);
  }
}

/**
 * The module refers to an external package.
 *
 * Search for the package under node_modules, starting from the given search
 * directory, and moving up through each parent. If found, resolve the module
 * to a file within the package.
 *
 * If the module wasn't resolved, repeat the process using the corresponding
 * at-types package.
 *
 * @param context Resolver context
 * @param moduleRef Module to resolve
 * @param searchDir Directory to start searching for the module's package
 * @param extensions List of allowed module file extensions
 * @returns Resolved module, or `undefined` if resolution fails
 */
export function resolvePackageModule(
  context: ResolverContext,
  moduleRef: PackageModuleRef,
  searchDir: string,
  extensions: ts.Extension[]
): ts.ResolvedModuleFull | undefined {
  const { host, options } = context;

  const traceEnabled = isTraceEnabled(host, options);

  let module: ts.ResolvedModuleFull | undefined = undefined;

  // Resolve the module to a file within the package
  if (traceEnabled) {
    host.trace(
      `Searching for external package ${
        moduleRef.scope
          ? moduleRef.scope + "/" + moduleRef.name
          : moduleRef.name
      } starting in ${searchDir}.`
    );
  }
  const pkgDir = findPackageDependencyDir(context, moduleRef, searchDir);
  if (pkgDir) {
    if (traceEnabled) {
      host.trace(`Loading module from external package '${pkgDir}'.`);
    }

    module = resolveModule(context, pkgDir, moduleRef.path, extensions);
    if (!module && moduleRef.path) {
      // Try again, without using a path. Type modules don't have to use the
      // same file layout as the corresponding source code modules. For
      // example, type info could be in a single, hand-crafted file, while
      // the source code is spread across many files.
      module = resolveModule(context, pkgDir, undefined, ExtensionsTypeScript);
    }
  }

  if (!module && moduleRef.scope !== "@types") {
    // The module wasn't resolved using the given package reference. Try again,
    // looking for a corresponding @types package.
    const typesModuleRef: PackageModuleRef = {
      scope: "@types",
      name: getMangledPackageName(moduleRef),
      path: moduleRef.path,
    };
    module = resolvePackageModule(
      context,
      typesModuleRef,
      searchDir,
      ExtensionsTypeScript
    );
  }

  return module;
}

/**
 * This module refers to a specific file.
 *
 * Search for it using the given directory.
 *
 * @param context Resolver context
 * @param moduleRef Module to resolve
 * @param searchDir Directory to search for the module file
 * @param extensions List of allowed module file extensions
 * @returns Resolved module, or `undefined` if module fails
 */
export function resolveFileModule(
  context: ResolverContext,
  moduleRef: FileModuleRef,
  searchDir: string,
  extensions: ts.Extension[]
): ts.ResolvedModuleFull | undefined {
  const { host, options } = context;

  if (isTraceEnabled(host, options)) {
    host.trace(`Loading module from directory '${searchDir}'.`);
  }
  return findModuleFile(context, searchDir, moduleRef.path, extensions);
}
