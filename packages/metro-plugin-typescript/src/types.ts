import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type { Project } from "@rnx-kit/typescript-service";
import type { DeltaResult, Graph } from "metro";

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
export type ProjectCache = {
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
};

export type SerializerHook = (graph: Graph, delta: DeltaResult) => void;
