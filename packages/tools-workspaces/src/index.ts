import * as path from "path";
import {
  findSentinel,
  findSentinelSync,
  getImplementation,
  getImplementationSync,
} from "./common";
import { WorkspacesInfoImpl } from "./info";
import type { WorkspacesInfo } from "./types";
export type { WorkspacesInfo } from "./types";

export { loadConfigFile } from "./external/finder";
export { enableLogging, trace } from "./external/logging";
export { getConfigurationOptions } from "./external/options";
export { getSettingsFromRepo } from "./external/settings";
export type {
  ConfigurationEntry,
  ConfigurationOptions,
  DefinitionFinder,
  ExternalDeps,
  PackageDefinition,
  Settings,
} from "./external/types";

/**
 * Returns a list of all packages declared under workspaces.
 */
export async function findWorkspacePackages(): Promise<string[]> {
  const sentinel = await findSentinel();
  if (!sentinel) {
    return [];
  }

  const { findWorkspacePackages } = await getImplementation(sentinel);
  return await findWorkspacePackages(sentinel);
}

/**
 * Returns a list of all packages declared under workspaces synchronously.
 */
export function findWorkspacePackagesSync(): string[] {
  const sentinel = findSentinelSync();
  if (!sentinel) {
    return [];
  }

  const { findWorkspacePackagesSync } = getImplementationSync(sentinel);
  return findWorkspacePackagesSync(sentinel);
}

/**
 * Returns the root of the workspace; `undefined` if not a workspace.
 */
export async function findWorkspaceRoot(): Promise<string | undefined> {
  const sentinel = await findSentinel();
  return sentinel && path.dirname(sentinel);
}

/**
 * Returns the root of the workspace synchronously; `undefined` if not a
 * workspace.
 */
export function findWorkspaceRootSync(): string | undefined {
  const sentinel = findSentinelSync();
  return sentinel && path.dirname(sentinel);
}

export async function getWorkspacesInfo(): Promise<WorkspacesInfo> {
  const sentinel = await findSentinel();
  if (!sentinel) {
    throw new Error("Could not find the root of the workspaces");
  }
  return new WorkspacesInfoImpl(sentinel);
}

export function getWorkspacesInfoSync(): WorkspacesInfo {
  const sentinel = findSentinelSync();
  if (!sentinel) {
    throw new Error("Could not find the root of the workspaces");
  }
  return new WorkspacesInfoImpl(sentinel);
}
