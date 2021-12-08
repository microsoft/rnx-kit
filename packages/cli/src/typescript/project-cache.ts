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
  getProjectInfo(sourceFile: string, platform: AllPlatforms): ProjectInfo;
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

  function readTSConfig(root: string): ts.ParsedCommandLine {
    const configFileName = path.join(root, "tsconfig.json");

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
  ): ProjectInfo {
    // Load the TypeScript configuration file for this project.
    const cmdLine = readTSConfig(root);

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

    //  Store TypeScript's source file list for this project. We'll use it later
    //  to filter files from Metro's file graph. We only want to check files that
    //  TypeScript considers to be source code, and not transpiled output.
    const tssourceFiles = new Set(cmdLine.fileNames);

    // Start with an empty project
    tsproject.removeAllFiles();

    return {
      tsproject,
      tssourceFiles,
    };
  }

  function getProjectInfo(
    sourceFile: string,
    platform: AllPlatforms
  ): ProjectInfo {
    const root = findProjectRoot(sourceFile);
    projects[root] ||= {};

    let info = projects[root][platform];
    if (!info) {
      info = createProjectInfo(root, platform);
      projects[root][platform] = info;
    }
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
