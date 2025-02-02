import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type ts from "typescript";

/**
 * Options that control how the buildTypescript command should be configured
 */
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
  /* platform specific suffixes + a no suffix entry. e.g.: ['.android', '.native', '.'] */
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

/**
 * Interface for reporting logging and timing information
 */
export type Reporter = Logger &
  Timer & {
    // reports true if no errors have been reported
    report(): void;

    // how many errors were encountered
    errors(): number;

    // name this reporter was created with
    createSubReporter(tag: string): Reporter;
  };

/**
 * Interface for capping the max number of async operations that happen at any given
 * time. This allows for multiple AsyncWriter instances to be used in parallel while
 * still limiting the max number of concurrent operations
 */
export type AsyncThrottler = {
  // run a function asynchronously, throttling to the number of concurrent operations
  run: (fn: () => Promise<void>) => Promise<void>;
};

/**
 * Interface for handling async file writing. There is a synchronous write function
 * then a finish function that will wait for all writes to complete
 */
export type AsyncWriter = {
  // write file implementation, should return synchronously
  writeFile: (fileName: string, data: string) => void;

  // finish writing all files, should return a promise that resolves when all writes are complete
  finish: () => Promise<void>;
};

/**
 * Context for setting up build tasks or for opening typescript projects
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
  writer?: AsyncWriter;
};

/**
 * Results of parsing a file name
 */
export type ParsedFileName = {
  // base file name
  base: string;
  // suffix occurring before the extension, if it exists, in the form of .android .ios etc.
  suffix?: string;
  // file extension with . included such as .ts .js or .json
  ext?: string;
};
