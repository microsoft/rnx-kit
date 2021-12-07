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
   * Get the project which targets a specific platform and contains a specific
   * source file. If the project is not cached, load it and add it to the cache.
   *
   * @param platform Target platform
   * @param sourceFile Source file
   * @returns Project targeting the given platform and containing the given source file
   */
  getProject(sourceFile: string, platform: AllPlatforms): Project;
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
  const projects: Record<string, Partial<Record<AllPlatforms, Project>>> = {};

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

  function createProject(root: string, platform: AllPlatforms): Project {
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

    // Start with an empty project, ignoring the file graph from tsconfig.json.
    tsproject.removeAllFiles();

    return tsproject;
  }

  function getProject(sourceFile: string, platform: AllPlatforms): Project {
    const root = findProjectRoot(sourceFile);
    if (!projects[root]) {
      projects[root] = {};
    }
    if (!projects[root][platform]) {
      projects[root][platform] = createProject(root, platform);
    }
    return projects[root][platform]!;
  }

  function clearPlatform(platform: AllPlatforms): void {
    Object.values(projects).forEach((projectsByPlatform) => {
      const project = projectsByPlatform[platform];
      if (project) {
        project.dispose();
        delete projectsByPlatform[platform];
      }
    });
  }

  return {
    clearPlatform,
    getProject,
  };
}
