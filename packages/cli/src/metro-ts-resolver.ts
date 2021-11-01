import {
  FileModuleRef,
  findFirstFileExists,
  findPackageDependencyDir,
  findPackageDir,
  getMangledPackageName,
  isFileModuleRef,
  isPackageModuleRef,
  normalizePath,
  PackageModuleRef,
  parseModuleRef,
  readPackage,
} from "@rnx-kit/tools-node";
import {
  createDefaultResolverHost,
  ResolverHost,
} from "@rnx-kit/typescript-service";
import fs from "fs";
import type { Dependency } from "metro";
import module from "module";
import path from "path";
import type {
  Extension,
  ParsedCommandLine,
  ResolvedModuleFull,
  ResolvedModuleWithFailedLookupLocations,
  ResolvedProjectReference,
  ResolvedTypeReferenceDirective,
} from "typescript";

/**
 * Search for a source file (`.ts` or `.tsx`) or a declaration file (`.d.ts`) adjacent
 * to the given transpiled file.
 *
 * @param transpiledFile Transpiled file. Typically a `.js` or `.jsx` file
 * @returns Path to the matching TypeScript source or declaration file, or `undefined` if nothing was found
 */
export function findAdjacentTsSourceOrDtsFile(
  transpiledFile: string
): string | undefined {
  const transpiledDir = path.dirname(transpiledFile);
  const transpiledFileName = path.basename(transpiledFile);
  const ext = path.extname(transpiledFileName);
  const transpiledFileBase = transpiledFileName.slice(0, -ext.length);

  return findFirstFileExists(
    transpiledDir,
    transpiledFileBase + ".ts",
    transpiledFileBase + ".tsx",
    transpiledFileBase + ".d.ts"
  );
}

/**
 * Search a package for a TypeScript declaration (`.d.ts`) file. If a module path
 * is provided, use that to find the corresponding `.d.ts` file. Otherwise, consult
 * `package.json`, using `typings` or `types` to find the root `.d.ts` file. Fall
 * back to using `index.d.ts`.
 *
 * @param pkgDir Package root directory
 * @param modulePath Optional relative path to the module which has a `.d.ts` file
 * @returns The path of the found `.d.ts` file, or `undefined` if nothing was found
 */
export function findDtsFileInPackage(
  pkgDir: string,
  modulePath: string | undefined
): string | undefined {
  if (modulePath) {
    // Find the corresponding `.d.ts` file for this module
    return findFirstFileExists(pkgDir, modulePath + ".d.ts");
  }

  // Consult package.json for a .d.ts file, falling back to index.d.ts
  const typesPkg = readPackage(pkgDir);
  return findFirstFileExists(
    pkgDir,
    typesPkg.typings ?? "",
    typesPkg.types ?? "",
    "index.d.ts"
  );
}

/**
 * Search for a module's declaration (`.d.ts`) file within a package dependency.
 * Package dependencies are under node_modules/[`scope`]/[`name`].
 *
 * Example: `moduleRef` is { name: 'react-native', path: 'libraries' } and
 * `searchRoot` is /repos/rnx-kit/packages/typescript-service.
 *
 * First, search for the package dependency:
 *
 *   - /repos/rnx-kit/packages/typescript-service/node_modules/react-native/package.json
 *   - /repos/rnx-kit/packages/node_modules/react-native/package.json
 *   - /repos/rnx-kit/node_modules/react-native/package.json
 *
 * Then look for the module's `.d.ts` file:
 *
 *   - /repos/rnx-kit/node_modules/react-native/libraries.d.ts
 *
 * @param moduleRef Module reference
 * @param searchRoot Starting point for finding the module and its `.d.ts` file.
 * @returns Path to the module's `.d.ts`, or `undefined` if not found.
 */
export function findDtsFileInPackageDependency(
  moduleRef: PackageModuleRef,
  searchRoot: string
): string | undefined {
  const pkgDir = findPackageDependencyDir(moduleRef, { startDir: searchRoot });
  if (pkgDir) {
    return findDtsFileInPackage(pkgDir, moduleRef.path);
  }

  return undefined;
}

/**
 * Search for a module's declaration (`.d.ts`) file within an \@types package
 * dependency. Package dependnecies are under node_modules/[`scope`]/[`name`].
 *
 * Example: `moduleRef` is { scope: '@babel', name: 'core' } and
 * `searchRoot` is /repos/rnx-kit/packages/typescript-service.
 *
 * First, search for the \@types package dependency:
 *
 *   - /repos/rnx-kit/packages/typescript-service/node_modules/@types/babel__core/package.json
 *   - /repos/rnx-kit/packages/node_modules/@types/babel__core/package.json
 *   - /repos/rnx-kit/node_modules/@types/babel__core/package.json
 *
 * Then look for the module's `.d.ts` file:
 *
 *   - /repos/rnx-kit/node_modules/@types/babel__core/ + `packageJson["typings"]`
 *   - /repos/rnx-kit/node_modules/@types/babel__core/ + `packageJson["types"]`
 *   - /repos/rnx-kit/node_modules/@types/babel__core/index.d.ts
 *
 * @param moduleRef Module reference
 * @param searchRoot Starting point for finding the \@types module and its `.d.ts` file
 * @returns Path to the \@types modulel's `.d.ts`, or `undefined` if not found.
 */
export function findDtsFileInAtTypesPackageDependency(
  moduleRef: PackageModuleRef,
  searchRoot: string
): string | undefined {
  const atTypesModuleRef = {
    scope: "@types",
    name: getMangledPackageName(moduleRef),
  };
  const pkgDir = findPackageDependencyDir(atTypesModuleRef, {
    startDir: searchRoot,
  });
  if (pkgDir) {
    return findDtsFileInPackage(pkgDir, moduleRef.path);
  }

  return undefined;
}

/**
 * Resolve a package module reference to a `.d.ts` file.
 *
 * @param ref Package module reference
 * @param containingFile File which contains the package module reference as an import/require
 * @returns A resolved declaration file, or `undefined` if nothing was found
 */
export function resolvePackageModuleToDts(
  ref: PackageModuleRef,
  containingFile: string
): string | undefined {
  //  Skip built-in packages
  if (module.builtinModules.indexOf(ref.name) !== -1) {
    return undefined;
  }

  //  Search from the root of the containing file's package
  const searchRoot = findPackageDir(containingFile);
  if (searchRoot) {
    //  Look for a matching .d.ts in the package
    let dtsFile = findDtsFileInPackageDependency(ref, searchRoot);

    //  Look for a matching .d.ts in the corresponding @types package
    dtsFile = dtsFile ?? findDtsFileInAtTypesPackageDependency(ref, searchRoot);
    return dtsFile;
  }

  return undefined;
}

/**
 * Resolve a file module reference to a `.d.ts` file.
 *
 * @param ref File module reference
 * @param containingFile File which contains the file module reference as an import/require
 * @returns A resolved declaration file, or `undefined` if nothing was found
 */
export function resolveFileModuleToDts(
  ref: FileModuleRef,
  containingFile: string
): string | undefined {
  //  This is a file module reference, which means it's a relative or absolute path.
  //  Resolve the path using the containing file's parent directory. Then look for
  //  the .d.ts file named by the module.
  const target = path.join(path.dirname(containingFile), ref.path) + ".d.ts";
  if (fs.existsSync(target)) {
    return target;
  }
  return undefined;
}

/**
 * Resolve each module to a TypeScript declaration file.
 *
 * @param moduleNames Module names to resolve
 * @param containingFile File which contains each module as an import/require
 * @returns Array of resolved declaration files, or `undefined` if resolution fails
 */
export function resolveModulesToDtsFiles(
  moduleNames: string[],
  containingFile: string
): (string | undefined)[] {
  const resolved: (string | undefined)[] = [];
  for (const moduleName of moduleNames) {
    let dtsFile: string | undefined = undefined;

    const ref = parseModuleRef(moduleName);
    if (isPackageModuleRef(ref)) {
      dtsFile = resolvePackageModuleToDts(ref, containingFile);
    } else if (isFileModuleRef(ref)) {
      dtsFile = resolveFileModuleToDts(ref, containingFile);
    }

    resolved.push(dtsFile);
  }

  return resolved;
}

/**
 * Resolve each module to a TypeScript source or declaration file using a module map.
 *
 * @param moduleNames Module names to resolve
 * @param moduleMap Module map
 * @returns Array of resolved source or declaration files
 */
export function resolveModulesUsingMap(
  moduleNames: string[],
  moduleMap: ModuleMap
): (string | undefined)[] {
  const resolved: (string | undefined)[] = [];
  for (const moduleName of moduleNames) {
    if (moduleName in moduleMap) {
      const moduleFileName = moduleMap[moduleName];

      let result: string | undefined = undefined;

      // If the source file for this module is JavaScript, it might be the
      // result of transpiling a TypeScrout source file. Look for a matching
      // source or declaration file.
      const ext = path.extname(moduleFileName).toLowerCase();
      if (ext === ".js" || ext === ".jsx") {
        // Look for a source or declaration file next to the module file.
        result = findAdjacentTsSourceOrDtsFile(moduleFileName);
      }

      if (!result) {
        // If this module is package-based, there may be a corresponding @types module
        // available. Look for the @types module. Start searching from the root of the
        // module file's package.
        const ref = parseModuleRef(moduleName);
        if (isPackageModuleRef(ref)) {
          const searchRoot = findPackageDir(moduleFileName);
          if (searchRoot) {
            result = findDtsFileInAtTypesPackageDependency(ref, searchRoot);
          }
        }

        if (!result) {
          // Fall back to returning the module file name.
          result = moduleFileName;
        }
      }

      resolved.push(result);
    } else {
      resolved.push(undefined);
    }
  }
  return resolved;
}

/**
 * Mapping from a module reference to a file.
 *
 * {
 *   'react-native': '/repos/myproject/node_modules/react-native-windows/index.js',`
 *   './App.tsx':    '/repos/myproject/packages/my-app/src/App.native.tsx'
 *   '../app.json':  '/repos/myproject/packages/my-app/app.json'
 * }
 */
export type ModuleMap = Record<string, string>;

/**
 * Mapping from a source file to its module dependenies -- what it imports/requires.
 */
export type SourceFileMap = Record<string, ModuleMap>;

/**
 * Collection of source files and their dependencies.
 */
export class SourceFiles {
  private files: SourceFileMap;

  constructor() {
    this.files = {};
  }

  public get(fileName: string): ModuleMap | undefined {
    const normalized = normalizePath(fileName);
    return this.files[normalized];
  }

  public set(fileName: string, metroModules: Map<string, Dependency>): void {
    const normalized = normalizePath(fileName);

    // extract each Metro dependency
    const modules: ModuleMap = {};
    metroModules.forEach((value: Dependency, key: string) => {
      modules[key] = normalizePath(value.absolutePath);
    });

    this.files[normalized] = modules;
  }

  public remove(fileName: string): void {
    const normalized = normalizePath(fileName);
    delete this.files[normalized];
  }
}

export class MetroTypeScriptResolverHost {
  private sourceFiles: SourceFiles;
  private defaultResolverHost: ResolverHost;

  constructor(cmdLine: ParsedCommandLine) {
    this.sourceFiles = new SourceFiles();
    this.defaultResolverHost = createDefaultResolverHost(cmdLine.options);
  }

  public getSourceFiles(): SourceFiles {
    return this.sourceFiles;
  }

  public resolveModuleNames(
    moduleNames: string[],
    containingFile: string,
    _reusedNames: string[] | undefined,
    _redirectedReference?: ResolvedProjectReference
  ): (ResolvedModuleFull | undefined)[] {
    let resolved: (string | undefined)[] | undefined = undefined;

    const moduleMap = this.sourceFiles.get(containingFile);
    if (moduleMap) {
      // We have a module map for the containing file. Use it to resolve each
      // module to a TypeScript source or declaration file.
      resolved = resolveModulesUsingMap(moduleNames, moduleMap);
    } else if (containingFile.toLowerCase().endsWith(".d.ts")) {
      // We don't have a module map. If the containing file is a declaration
      // (.d.ts) file, resolve each module to a declaration file.
      resolved = resolveModulesToDtsFiles(moduleNames, containingFile);
    }

    if (resolved) {
      return resolved.map((r) => {
        if (r) {
          return {
            resolvedFileName: r,
            extension: path.extname(r) as Extension,
          };
        }
        return undefined;
      });
    }

    return moduleNames.map((_) => undefined);
  }

  public getResolvedModuleWithFailedLookupLocationsFromCache(
    moduleName: string,
    containingFile: string
  ): ResolvedModuleWithFailedLookupLocations | undefined {
    return this.defaultResolverHost.getResolvedModuleWithFailedLookupLocationsFromCache(
      moduleName,
      containingFile
    );
  }

  public resolveTypeReferenceDirectives(
    typeDirectiveNames: string[],
    containingFile: string,
    redirectedReference?: ResolvedProjectReference
  ): (ResolvedTypeReferenceDirective | undefined)[] {
    return this.defaultResolverHost.resolveTypeReferenceDirectives(
      typeDirectiveNames,
      containingFile,
      redirectedReference
    );
  }
}
