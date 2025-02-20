export { getExternalWorkspaces } from "./external/settings";
export type {
  DefinitionFinder,
  ExternalDeps,
  ExternalWorkspaces,
  ExternalWorkspacesConfig,
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
