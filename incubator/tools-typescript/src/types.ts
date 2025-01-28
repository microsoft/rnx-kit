import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type ts from "typescript";
import type { BatchWriter } from "./files";

export type BuildOptions = {
  /** Target directory for the build, should correspond to the package root */
  target?: string;

  /** Is this build for react-native, will attempt to detect platforms if set. */
  reactNative?: boolean;

  /** Which react-native platforms should be targeted (if any). Overrides auto-detection */
  platforms?: AllPlatforms[];

  /** Write out files asynchronously. Experimental feature. */
  asyncWrites?: boolean;

  /**
   * Provide verbose logging output
   */
  verbose?: boolean;

  /**
   * Provide detailed trace output
   */
  trace?: boolean;

  /**
   * Additional typescript options
   */
  options?: ts.CompilerOptions;

  /**
   * Raw command line arguments to pass along to Typescript
   */
  args?: string[];
};

/**
 * Information about each available platform
 */
export type PlatformInfo = {
  pkgName: string;
  suffixes: string[];
};

/**
 * Additional context attached to the build options to pass along to build tasks
 */
export type BuildContext = BuildOptions & {
  // parsed command line for this build
  cmdLine: ts.ParsedCommandLine;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(...args: any[]): void;
  time(label: string, fn: () => void): void;
  timeAsync(label: string, fn: () => Promise<void>): Promise<void>;

  // resolved information about the platforms to target
  platformInfo: Record<string, PlatformInfo>;

  // the focused platform for this build
  platform?: AllPlatforms;

  // list of files to build & type-check
  build?: string[];
  check?: string[];

  // async file writer to write the files for this build
  writer?: BatchWriter;
};
