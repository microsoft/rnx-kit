// base functionality
export { runWithCmdlineArgs } from "./bin/ts-tool";
export { runBuild, runBuildCmdline } from "./command";
export type { ToolCmdLineOptions } from "./types";

// utility functions
export { BatchWriter, Throttler } from "./files";
export { detectReactNativePlatforms } from "./platforms";
export { sanitizeOptions } from "./tsOptions";
