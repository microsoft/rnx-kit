import { findPackageDir } from "@rnx-kit/tools-node";
import {
  AllPlatforms,
  platformExtensions,
} from "@rnx-kit/tools-react-native/platform";
import { changeHostToUseReactNativeResolver } from "@rnx-kit/typescript-react-native-resolver";
import {
  createDiagnosticWriter,
  Project,
  readConfigFile,
} from "@rnx-kit/typescript-service";
import fs from "fs";
import path from "path";
import ts from "typescript";

export type ProjectInfo = {
  tsproject: Project;
  tssourceFiles: Set<string>;
};

/**
 * Collection of TypeScript projects, separated by their target platform.
 *
 * Target platform is a react-native concept, not a TypeScript concept.
 * However, each project is configured with react-native module resolution,
 * which means the module file graph could vary by platform. And that means
 * each platform could yield different type errors.
 *
 * For example, `import { f } from "./utils"` could load `./utils.android.ts`
 * for Android and `./utils.ios.ts` iOS.
 */
export interface ProjectCache {
  /**
   * Discard all cached projects targeting a specific platform.
   *
   * @param platform Target platform
   */
  clearPlatform(platform: AllPlatforms): void;

  /**
   * Get info on the project which targets a specific platform and contains a specific
   * source file. If the project is not cached, load it and add it to the cache.
   *
   * @param platform Target platform
   * @param sourceFile Source file
   * @returns Project targeting the given platform and containing the given source file
   */
  getProjectInfo(
    sourceFile: string,
    platform: AllPlatforms
  ): ProjectInfo | undefined;
}

/**
 * Create an empty cache for holding TypeScript projects.
 *
 * @param print Optional method for printing messages. When not set, messages are printed to the console.
 * @returns Empty project cache
 */
export function createProjectCache(
  print?: (message: string) => void
): ProjectCache {
  const documentRegistry = ts.createDocumentRegistry();
  const diagnosticWriter = createDiagnosticWriter(print);

  // Collection of projects organized by root directory, then by platform.
  const projects: Record<
    string,
    Partial<Record<AllPlatforms, ProjectInfo>>
  > = {};

  function findProjectRoot(sourceFile: string): string {
    // Search known root directories to see if the source file is in one of them.
    for (const root of Object.keys(projects)) {
      if (sourceFile.startsWith(root)) {
        return root;
      }
    }

    // Search the file system for the root of source file's package.
    const root = findPackageDir(path.dirname(sourceFile));
    if (!root) {
      throw new Error(
        `Cannot find project root for source file '${sourceFile}'`
      );
    }

    return root;
  }

  function readTSConfig(root: string): ts.ParsedCommandLine | undefined {
    const configFileName = path.join(root, "tsconfig.json");
    if (!fs.existsSync(configFileName)) {
      // Allow for packages that aren't TypeScript.
      //
      // Example: Users who enable bundling with all the config defaults will
      // have type validation enabled automatically. They may not actually be
      // using TypeScript.
      //
      // We shouldn't break them. We should use TS validation only for TS packages.
      //
      return undefined;
    }

    const cmdLine = readConfigFile(configFileName);
    if (!cmdLine) {
      throw new Error(`Failed to load '${configFileName}'`);
    } else if (cmdLine.errors.length > 0) {
      const writer = createDiagnosticWriter();
      cmdLine.errors.forEach((e) => writer.print(e));
      throw new Error(`Failed to load '${configFileName}'`);
    }

    return cmdLine;
  }

  function createProjectInfo(
    root: string,
    platform: AllPlatforms
  ): ProjectInfo | undefined {
    // Load the TypeScript configuration file for this project.
    const cmdLine = readTSConfig(root);
    if (!cmdLine) {
      // Not a TypeScript project
      return undefined;
    }

    //  Trim down the list of source files found by TypeScript. This ensures
    //  that only explicitly added files are loaded and parsed by TypeScript.
    //  This is a perf optimization. We don't want to spend cycles on files
    //  that won't be used, such as *.android.ts when bundling for ios.
    //
    //  The exception to this rule are .d.ts files. They hold global types,
    //  modules and namespaces, and having them in the project is the only
    //  way they can be loaded.

    const tssourceFiles = new Set(cmdLine.fileNames);
    cmdLine.fileNames = cmdLine.fileNames.filter((f) => f.endsWith(".d.ts"));

    // Create a TypeScript project using the configuration file. Enhance the
    // underlying TS language service with our react-native module resolver.
    const enhanceLanguageServiceHost = (host: ts.LanguageServiceHost): void => {
      const platformExtensionNames = platformExtensions(platform);
      const disableReactNativePackageSubstitution = true;
      const traceReactNativeModuleResolutionErrors = false;
      const traceResolutionLog = undefined;
      changeHostToUseReactNativeResolver({
        host,
        options: cmdLine.options,
        platform,
        platformExtensionNames,
        disableReactNativePackageSubstitution,
        traceReactNativeModuleResolutionErrors,
        traceResolutionLog,
      });
    };
    const tsproject = new Project(
      documentRegistry,
      diagnosticWriter,
      cmdLine,
      enhanceLanguageServiceHost
    );

    return {
      tsproject,
      tssourceFiles,
    };
  }

  function getProjectInfo(
    sourceFile: string,
    platform: AllPlatforms
  ): ProjectInfo | undefined {
    const root = findProjectRoot(sourceFile);
    projects[root] = projects[root] || {};

    const platforms = projects[root];

    // Have we seen the project/platform for this source file before,
    // even if what we saw is 'undefined' (e.g. not a TS project)?
    if (Object.prototype.hasOwnProperty.call(platforms, platform)) {
      return platforms[platform];
    }

    // We haven't seen this project/platform before. Try to load it,
    // even if it isn't a TS project. Cache the result so we don't
    // do this again.
    const info = createProjectInfo(root, platform);
    platforms[platform] = info;
    return info;
  }

  function clearPlatform(platform: AllPlatforms): void {
    Object.values(projects).forEach((projectsByPlatform) => {
      const info = projectsByPlatform[platform];
      if (info) {
        if (info.tsproject) {
          info.tsproject.dispose();
        }
        delete projectsByPlatform[platform];
      }
    });
  }

  return {
    clearPlatform,
    getProjectInfo,
  };
}
