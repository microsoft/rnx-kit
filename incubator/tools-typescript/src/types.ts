import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type ts from "typescript";

export type BuildOptions = {
  /** Target directory for the build, should correspond to the package root */
  target?: string;

  /** Which react-native platforms should be targeted (if any). */
  platforms?: AllPlatforms[];

  /** Attempt to auto-detect the react-native platforms to target. */
  detectPlatforms?: boolean;

  /** Only emit files, this will also disable multiplexing the build for multiple platforms. */
  noTypecheck?: boolean;

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
 * Additional context attached to the build options to pass along to build tasks
 */
export type BuildContext = BuildOptions & {
  // parsed command line for this build
  cmdLine: ts.ParsedCommandLine;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(...args: any[]): void;
  time(label: string, fn: () => void): void;
  timeAsync(label: string, fn: () => Promise<void>): Promise<void>;
};
