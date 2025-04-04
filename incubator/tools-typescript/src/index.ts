// base functionality
export { buildTypeScript } from "./build.ts";
export { getDiagnosticWriter } from "./diagnostics.ts";
export { createAsyncThrottler, createAsyncWriter } from "./files.ts";
export { openProject } from "./host.ts";
export {
  loadPackagePlatformInfo,
  parseSourceFileReference as parseSourceFileDetails,
} from "./platforms.ts";
export { createReporter } from "./reporter.ts";
export { readTypeScriptConfig } from "./tsconfig.ts";
export type {
  AsyncThrottler,
  AsyncWriter,
  BuildOptions,
  ParsedFileReference,
  PlatformInfo,
  Reporter,
} from "./types.ts";
