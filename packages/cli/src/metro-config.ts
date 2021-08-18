import {
  CyclicDependencies,
  PluginOptions as CyclicDetectorOptions,
} from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import {
  DuplicateDependencies,
  Options as DuplicateDetectorOptions,
} from "@rnx-kit/metro-plugin-duplicates-checker";
import { MetroPlugin, MetroSerializer } from "@rnx-kit/metro-serializer";
import { MetroSerializer as MetroSerializerEsbuild } from "@rnx-kit/metro-serializer-esbuild";
import {
  findFirstFileExists,
  findPackageDependencyDir,
  findPackageDir,
  getMangledPackageName,
  isPackageModuleRef,
  PackageModuleRef,
  parseModuleRef,
  readPackage,
} from "@rnx-kit/tools-node";
import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import {
  createDefaultResolverHost,
  Project,
  ProjectConfig,
  ResolverHost,
} from "@rnx-kit/typescript-service";
import fs from "fs";
import type {
  DeltaResult,
  Dependency,
  Graph,
  MixedOutput,
  Module,
} from "metro";
import type { InputConfigT, SerializerConfigT } from "metro-config";
import module from "module";
import path from "path";
import type {
  Extension,
  ResolvedModuleFull,
  ResolvedModuleWithFailedLookupLocations,
  ResolvedProjectReference,
  ResolvedTypeReferenceDirective,
} from "typescript";
import type { TSProjectInfo } from "./types";

// TODO-WIP: refactor and reorganize this code, as well as @rnx-kit/typescript-service/resolve.ts

//--------------------
//
//  generic resolver utility methods -- do these, or some form of these, belong in resolve.ts?
//

/**
 * Search a package for a TypeScript declaration (`.d.ts`) file. If a path is
 * provided, use that to find a specific `.d.ts` file. Otherwise, return the
 * `.d.ts` file named in `package.json` under `typings` or `types`, or fall back
 * to using `index.d.ts`.
 *
 * @param pkgDir Package root directory
 * @param dtsPath Optional relative path to a specific `.d.ts` file
 * @returns The path of the found `.d.ts` file, or undefined if nothing was found
 */
export function findDtsFileInPackage(
  pkgDir: string,
  dtsPath: string | undefined
): string | undefined {
  if (dtsPath) {
    // Search for a specific .d.ts file
    return findFirstFileExists(pkgDir, dtsPath + ".d.ts");
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
 * Search for the module's TypeScript declaration (`.d.ts`) file.
 *
 * Find the module's package. Search for it under `node_modules`, starting
 * from `searchRoot` and moving up through parent directories.
 *
 * If the module's package was found, search within it for the `.d.ts` file.
 *
 * Example: `searchRoot` is /repos/rnx-kit/packages/typescript-service, and `namedModule` is { moduleName: 'react-native', modulePath: '/libraries' }:
 *
 * The package search will explore these directories, stopping as soon as it finds something:
 *
 *   - /repos/rnx-kit/packages/typescript-service/node_modules/react-native/package.json
 *   - /repos/rnx-kit/packages/node_modules/react-native/package.json
 *   - /repos/rnx-kit/node_modules/react-native/package.json
 *   - /repos/node_modules/react-native/package.json
 *   - /node_modules/react-native/package.json
 *
 * The module search will then use the module's path, appending the `.d.ts` suffix:
 *
 *   - /repos/rnx-kit/node_modules/react-native/libraries.d.ts
 *
 * @param namedModule Module details, such as name, scope and path
 * @param searchRoot Starting point for finding the module's package. Look for the package under `node_modules`. All parent directories will be searched.
 * @returns Path to the `.d.ts` for the named module, or `undefined` if not found.
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
 * Search for the named module's TypeScript declaration (`.d.ts`) file within its
 * \@types package.
 *
 * Find the module's \@types package. Search for it under `node_modules`, starting
 * from `searchRoot` and moving up through parent directories.
 *
 * If the module's \@types package was found, search within it for the `.d.ts` file.
 *
 * Example: `searchRoot` is /repos/rnx-kit/packages/typescript-service, and `namedModule` is { mangledName: 'babel__core' }:
 *
 * The package search will explore these directories, stopping as soon as it finds something:
 *
 *   - /repos/rnx-kit/packages/typescript-service/node_modules/@types/babel__core/package.json
 *   - /repos/rnx-kit/packages/node_modules/@types/babel__core/package.json
 *   - /repos/rnx-kit/node_modules/@types/babel__core/package.json
 *   - /repos/node_modules/@types/babel__core/package.json
 *   - /node_modules/@types/babel__core/package.json
 *
 * The module search will then use type props from `package.json` to find the root `.d.ts` file:
 *
 *   - /repos/rnx-kit/node_modules/@types/babel__core/ + `packageJson["typings"]`
 *   - /repos/rnx-kit/node_modules/@types/babel__core/ + `packageJson["types"]`
 *   - /repos/rnx-kit/node_modules/@types/babel__core/ + "index.d.ts"
 *
 * @param namedModule Module details, such as name, scope and path
 * @param searchRoot Starting point for finding the module's \@types package. Look for the package under `node_modules`. All parent directories will be searched.
 * @returns Path to the `.d.ts` for the named module, or `undefined` if not found.
 */
export function findDtsFileInAtTypesPackageDependency(
  moduleRef: PackageModuleRef,
  searchRoot: string
): string | undefined {
  const pkgDir = findPackageDependencyDir(
    {
      scope: "@types",
      name: getMangledPackageName(moduleRef),
    },
    { startDir: searchRoot }
  );
  if (pkgDir) {
    return findDtsFileInPackage(pkgDir, moduleRef.path);
  }

  return undefined;
}

//------------------------------
//
//  specific resolver methods for Metro + TS -- can anyone more generic logic be extracted?
//

/**
 * Mapping from a module dependency to a file.
 *
 * {
 *   'react-native': '/repos/myproject/node_modules/react-native-windows/index.js',
 *   './App.tsx':    '/repos/myproject/packages/my-app/src/App.native.tsx'
 *   '../app.json':  '/repos/myproject/packages/my-app/app.json'
 * }
 */
type DependencyMap = Record<string, string>;

/**
 * Collection of dependency maps, per file.
 */
type FileDependencies = Record<string, DependencyMap>;

export class MetroTypeScriptResolverHost {
  private fileDependencies: FileDependencies;
  private defaultResolverHost: ResolverHost;

  constructor(config: ProjectConfig) {
    this.fileDependencies = {};
    this.defaultResolverHost = createDefaultResolverHost(config.options);
  }

  public hasFile(fileName: string): boolean {
    return Object.prototype.hasOwnProperty.call(
      this.fileDependencies,
      fileName
    );
  }

  public setModule(module: Module<MixedOutput>): void {
    // extract each module dependency
    const dependencies: Record<string, string> = {};
    module.dependencies.forEach(
      (value: Dependency, key: string, _map: unknown) => {
        dependencies[key] = value.absolutePath;
      }
    );

    this.fileDependencies[module.path] = dependencies;
  }

  public removeFile(fileName: string): void {
    delete this.fileDependencies[fileName];
  }

  public removeAllFiles(): void {
    this.fileDependencies = {};
  }

  /**
   * Using a given JavaScript file, find the corresponding TypeScript source
   * or declaration file.
   *
   * @param moduleRef Module reference to the JavaScript file, such as 'mod', '@scope/mod', 'mod/path/to/file', or '@scope/mod/path/to/file'
   * @param jsFileName JavsScript file
   * @returns TypeScript source or declaration file, or undefined if none were found
   */
  private findMatchingTypeScriptFile(
    moduleRef: string,
    jsFileName: string
  ): string | undefined {
    const ext = path.extname(jsFileName);
    const baseFileName = jsFileName.slice(0, -ext.length);

    // Look for source files or a declaration file right next to the input file
    if (fs.existsSync(baseFileName + ".ts")) {
      return baseFileName + ".ts";
    } else if (fs.existsSync(baseFileName + ".tsx")) {
      return baseFileName + ".tsx";
    } else if (fs.existsSync(baseFileName + ".d.ts")) {
      return baseFileName + ".d.ts";
    }

    const ref = parseModuleRef(moduleRef);
    if (isPackageModuleRef(ref)) {
      // This is a named module. Look for a corresponding @types module.
      // Return the matching .d.ts file for this module reference.

      // Start searching from the root of the JS file's package.
      const sourcePkgDir = findPackageDir(path.dirname(jsFileName));
      if (sourcePkgDir) {
        return findDtsFileInAtTypesPackageDependency(ref, sourcePkgDir);
      }
    }

    // We didn't find a correspoding TypeScript source or declaration file.
    return undefined;
  }

  public resolveModuleUsingDependencyMap(
    dependencies: DependencyMap,
    moduleName: string
  ): ResolvedModuleFull | undefined {
    if (moduleName in dependencies) {
      let fileName = dependencies[moduleName];

      const ext = path.extname(fileName).toLowerCase();
      if (ext === ".js" || ext === ".jsx") {
        // The file is JavaScript, so it might have a matching TypeScript
        // source or declaration file.
        const tsFileName = this.findMatchingTypeScriptFile(
          moduleName,
          fileName
        );
        if (tsFileName) {
          fileName = tsFileName;
        }
      }

      console.log(`   ${moduleName} -> ${fileName}`);
      return {
        resolvedFileName: fileName,
        extension: path.extname(fileName) as Extension,
      };
    }

    if (module.builtinModules.indexOf(moduleName) !== -1) {
      console.log(`   ${moduleName} -> IGNORED: built-in module`);
      return undefined;
    }

    console.log(`   ${moduleName} -> NO RESOLUTION: module not in list`);
    return undefined;
  }

  public resolveDtsModule(
    containingFile: string,
    moduleName: string
  ): ResolvedModuleFull | undefined {
    let dtsFile: string | undefined = undefined;
    const ref = parseModuleRef(moduleName);
    if (isPackageModuleRef(ref)) {
      if (module.builtinModules.indexOf(ref.name) !== -1) {
        console.log(`   ${moduleName} -> IGNORED: built-in module`);
        return undefined;
      }

      // Start searching from the root of the JS file's package.
      const containingPkgDir = findPackageDir(containingFile);
      if (containingPkgDir) {
        dtsFile = findDtsFileInPackageDependency(ref, containingPkgDir);
        if (!dtsFile) {
          dtsFile = findDtsFileInAtTypesPackageDependency(
            ref,
            containingPkgDir
          );
        }
      }
    } else if (ref.path) {
      // this is a file-module reference, which means it's only a path.
      // resolve the relative module path using the containing file.
      // look for the .d.ts file named by the module.
      const target =
        path.join(path.dirname(containingFile), ref.path) + ".d.ts";
      if (fs.existsSync(target)) {
        dtsFile = target;
      }
    }

    if (dtsFile) {
      console.log(`   ${moduleName} -> ${dtsFile}`);
      return {
        resolvedFileName: dtsFile,
        extension: path.extname(dtsFile) as Extension,
      };
    }

    console.log(`   ${moduleName} -> NO RESOLUTION: cannot find .d.ts file`);
    return undefined;
  }

  // TODO-WIP: cache as much as possible to avoid touching the disk (file exists, reading a file, etc)

  //----------------------------------------------
  //
  //  ResolverHost implementation
  //

  public resolveModuleNames(
    moduleNames: string[],
    containingFile: string,
    _reusedNames: string[] | undefined,
    _redirectedReference?: ResolvedProjectReference
  ): (ResolvedModuleFull | undefined)[] {
    console.log(`${containingFile}`);

    if (this.hasFile(containingFile)) {
      const dependencies = this.fileDependencies[containingFile];
      return moduleNames.map((m) =>
        this.resolveModuleUsingDependencyMap(dependencies, m)
      );
    }

    // .d.ts files aren't going to be in the resolver database because
    // they aren't source files -- they're declaration files. allow module
    // lookups from them so that dependendent .d.ts files can be loaded.
    if (containingFile.toLowerCase().endsWith(".d.ts")) {
      return moduleNames.map((m) => this.resolveDtsModule(containingFile, m));
    }

    console.log(`   * -> NO RESOLUTION: containing file not in list`);
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

function createSerializerHook({ service, configFileName }: TSProjectInfo) {
  const tsprojectByPlatform: Map<AllPlatforms, Project> = new Map();

  function resetProject(platform: AllPlatforms): void {
    const tsproject = tsprojectByPlatform.get(platform);
    if (tsproject) {
      tsproject.dispose();
      tsprojectByPlatform.delete(platform);
    }
  }

  function getProject(platform: AllPlatforms): Project {
    let tsproject = tsprojectByPlatform.get(platform);
    if (!tsproject) {
      // start with an empty project, ignoring the file graph provided by tsconfig.json
      const config = service.getProjectConfigLoader().load(configFileName);
      const resolverHost = new MetroTypeScriptResolverHost(config);
      tsproject = service.openProject(config, resolverHost);
      tsproject.removeAllFiles();

      tsprojectByPlatform.set(platform, tsproject);
    }
    return tsproject;
  }

  const hook = (graph: Graph, delta: DeltaResult): void => {
    // get the target platform for this hook call
    const platform = graph.transformOptions.platform as AllPlatforms;
    if (platform) {
      if (delta.reset) {
        resetProject(platform);
      }

      const tsproject = getProject(platform);
      const resolverHost =
        tsproject.getResolverHost() as MetroTypeScriptResolverHost;

      for (const module of delta.added.values()) {
        tsproject.setFile(module.path);
        resolverHost.setModule(module);
      }
      for (const module of delta.modified.values()) {
        tsproject.setFile(module.path);
        resolverHost.setModule(module);
      }
      for (const module of delta.deleted.values()) {
        tsproject.removeFile(module);
        resolverHost.removeFile(module);
      }

      //  validate the project, printing errors to the console
      tsproject.validate();
    }
  };

  return hook;
}

const emptySerializerHook = (_graph: Graph, _delta: DeltaResult): void => {
  // nop
};

/**
 * Customize the Metro configuration.
 *
 * @param metroConfigReadonly Metro configuration
 * @param detectCyclicDependencies When true, cyclic dependency checking is enabled with a default set of options. Otherwise the object allows for fine-grained control over the detection process.
 * @param detectDuplicateDependencies When true, duplicate dependency checking is enabled with a default set of options. Otherwise, the object allows for fine-grained control over the detection process.
 * @param tsprojectInfo When set, TypeScript validation is enabled during bundling and serving.
 * @param experimental_treeShake When true, experimental tree-shaking is enabled.
 */
export function customizeMetroConfig(
  metroConfigReadonly: InputConfigT,
  detectCyclicDependencies: boolean | CyclicDetectorOptions,
  detectDuplicateDependencies: boolean | DuplicateDetectorOptions,
  tsprojectInfo: TSProjectInfo | undefined,
  experimental_treeShake: boolean
): void {
  //  We will be making changes to the Metro configuration. Coerce from a
  //  type with readonly props to a type where the props are writeable.
  const metroConfig = metroConfigReadonly as InputConfigT;

  const plugins: MetroPlugin[] = [];
  if (typeof detectDuplicateDependencies === "boolean") {
    plugins.push(DuplicateDependencies());
  } else if (typeof detectDuplicateDependencies === "object") {
    plugins.push(DuplicateDependencies(detectDuplicateDependencies));
  }
  if (typeof detectCyclicDependencies === "boolean") {
    plugins.push(CyclicDependencies());
  } else if (typeof detectCyclicDependencies === "object") {
    plugins.push(CyclicDependencies(detectCyclicDependencies));
  }

  if (plugins.length > 0) {
    //  MetroSerializer acts as a CustomSerializer, and it works with both
    //  older and newer versions of Metro. Older versions expect a return
    //  value, while newer versions expect a promise.
    //
    //  Its return type is the union of both the value and the promise.
    //  This makes TypeScript upset because for any given version of Metro,
    //  it's one or the other. Not both.
    //
    //  Since it can handle either scenario, just coerce it to whatever
    //  the current version of Metro expects.
    const serializer = experimental_treeShake
      ? MetroSerializerEsbuild(plugins)
      : (MetroSerializer(plugins) as SerializerConfigT["customSerializer"]);

    metroConfig.serializer.customSerializer = serializer;
  } else {
    delete metroConfig.serializer.customSerializer;
  }

  metroConfig.serializer.experimentalSerializerHook = tsprojectInfo
    ? createSerializerHook(tsprojectInfo)
    : emptySerializerHook;
}
