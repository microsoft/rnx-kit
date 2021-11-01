// Diagnostics
export type { DiagnosticWriter } from "./diagnostics";
export { createDiagnosticWriter } from "./diagnostics";

// Configuration
export { findConfigFile, readConfigFile } from "./config";

// Module resolution
export type { ResolverHost } from "./resolve";
export {
  createDefaultResolverHost,
  createDefaultModuleResolutionHost,
} from "./resolve";

// Language services
export { Service } from "./service";
export { Project } from "./project";
