export { loadExternalDeps } from "./external/finder";
export { writeOutWorkspaces } from "./external/output";
export {
  getExternalWorkspacesSettings,
  settingsFromConfig,
} from "./external/settings";
export type {
  DefinitionFinder,
  ExternalDeps,
  ExternalWorkspacesConfig,
  ExternalWorkspacesSettings,
  PackageDefinition,
  TraceFunc,
} from "./external/types";
export {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "./find";
export { getWorkspacesInfo, getWorkspacesInfoSync } from "./info";
export type { WorkspacesInfo } from "./types";
