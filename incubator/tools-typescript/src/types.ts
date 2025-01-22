import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type ts from "typescript";

export type ToolCmdLineOptions = {
  /**
   * Root directory for the package
   */
  rootDir?: string;

  /**
   * Tells the tool to build one or more platforms for react-native.
   */
  platforms?: AllPlatforms[];

  /**
   * The tool will attempt to detect the platforms to build based on what it can determine
   * from various configurations and dependencies.
   */
  detectPlatforms?: boolean;

  /**
   * Only emit files and do not type-check them. This will also disable multiplexing the build
   * for multiple platforms. Useful if your project is building files twice for multiple module
   * types.
   */
  noTypecheck?: boolean;

  /**
   * Write out files asynchronously. Experimental feature.
   */
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
