// base functionality
export { buildTypescript } from "./build";
export type { BuildOptions, PlatformInfo } from "./types";

// utility functions
export { BatchWriter, Throttler } from "./files";
export { loadPkgPlatformInfo, splitFileNameAndSuffix } from "./platforms";
export { sanitizeOptions } from "./tsoptions";
