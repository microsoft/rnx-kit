import * as path from "path";
import {
  findSentinel,
  findSentinelSync,
  getImplementation,
  getImplementationSync,
} from "./common";

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
