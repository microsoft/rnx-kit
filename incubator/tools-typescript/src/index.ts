// base functionality
export { buildTypeScript } from "./build";
export { getDiagnosticWriter } from "./diagnostics";
export { createAsyncThrottler, createAsyncWriter } from "./files";
export { openProject } from "./host";
export {
  loadPackagePlatformInfo,
  parseSourceFileReference as parseSourceFileDetails,
} from "./platforms";
export { createReporter } from "./reporter";
export { readTypeScriptConfig } from "./tsconfig";
export type {
  AsyncThrottler,
  AsyncWriter,
  BuildOptions,
  ParsedFileReference,
  PlatformInfo,
  Reporter,
} from "./types";
