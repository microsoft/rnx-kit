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
   * Remap react-native imports to the appropriate platform package
   */
  remapReactNative?: boolean;

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
  /* android, ios, macos, windows, etc. */
  name: string;
  /* react-native, react-native-macos, etc. */
  pkgName: string;
  /* platform specific suffixes + an empty string. e.g.: ['android', 'native', ''] */
  suffixes: string[];
  /* remap react-native imports to the appropriate platform package for this platform */
  remapReactNative?: boolean;
};

/**
 * Interface for capturing logging information
 */
export type Logger = {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  trace(...args: unknown[]): void;
};

/**
 * Interface for capturing timing information
 */
export type Timer = {
  time<T>(label: string, fn: () => T): T;
  timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
  results(): Record<string, { count: number; time: number }>;
};

export type Reporter = Logger &
  Timer & {
    // reports true if no errors have been reported
    succeeded(report?: boolean): boolean;

    // name this reporter was created with
    createSubReporter(tag: string): Reporter;
  };

/**
 * Additional context attached to the build options to pass along to build tasks
 */
export type BuildContext = {
  // root path for the project
  root: string;

  // parsed command line for this build
  cmdLine: ts.ParsedCommandLine;

  // platform info for this build
  platform?: PlatformInfo;

  // list of files to build & type-check
  build?: string[];
  check?: string[];

  // logging functions
  reporter: Reporter;

  // async file writer to write the files for this build
  writer?: BatchWriter;
};

export type ParsedFileName = {
  // base file name
  base: string;
  // platform specific suffix, if it exists
  suffix?: string;
  // file extension
  ext: string;
};
