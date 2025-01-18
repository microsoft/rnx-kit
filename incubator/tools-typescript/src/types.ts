import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";

export type ToolCmdLineOptions = {
  /**
   * Tells the tool to build one or more platforms for react-native.
   * Example: --platforms=android|ios
   */
  platforms?: AllPlatforms[];

  /**
   * The tool will attempt to detect the platforms to build based on what it can determine
   * from various configurations and dependencies.
   * Usage --detectPlatforms
   */
  detectPlatforms?: boolean;

  /**
   * Only emit files and do not type-check them. This will also disable multiplexing the build
   * for multiple platforms. Useful if your project is building files twice for multiple module
   * types.
   */
  noTypecheck?: boolean;

  /**
   * Write out files asynchronously.
   */
  asyncWrites?: boolean;

  /**
   * Print out a help message.
   */
  help?: boolean;
};
