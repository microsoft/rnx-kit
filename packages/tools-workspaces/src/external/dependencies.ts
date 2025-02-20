import path from "node:path";
import { type ExternalDeps, type PackageDefinition } from "./types";

/**
 * Change the relative path of the package definition by the delta path. Also normalize it to posix
 * to make it platform portable for persistence.
 *
 * @param def PackageDefinition that needs to be rebased
 * @param delta relative delta path, effectively path.relative(from, to)
 * @returns a new PackageDefinition with the path rebased and normalized
 */
export function rebasePackageDefinition(
  def: PackageDefinition,
  delta: string
): PackageDefinition {
  return {
    path: def.path ? path.posix.normalize(path.join(delta, def.path)) : null,
    version: def.version,
  };
}

/**
 * @param deps ExternalDeps to rebase and normalize
 * @param delta the change in relative path, effictively path.relative(from, to)
 * @returns new rebased and normalized ExternalDeps
 */
export function rebaseExternalDeps(
  deps: ExternalDeps,
  delta: string
): ExternalDeps {
  const newDeps: ExternalDeps = {};
  for (const name in deps) {
    newDeps[name] = rebasePackageDefinition(deps[name], delta);
  }
  return newDeps;
}

type ChangeType = "add" | "remove" | "update";

function definitionsEqual(
  def1: PackageDefinition,
  def2: PackageDefinition
): boolean {
  return def1.path === def2.path && def1.version === def2.version;
}

/**
 * Find the changes between two ExternalDeps objects. This will return an object with the keys as the
 * names of the dependencies and the values as "added", "removed", or "changed" depending on the
 * change type.
 *
 * @param oldDeps the old ExternalDeps to compare against
 * @param newDeps the new ExternalDeps to compare to
 * @returns a record of changes or null if no changes were found
 */
export function findDependencyChanges(
  oldDeps: ExternalDeps,
  newDeps: ExternalDeps
): Record<string, ChangeType> | null {
  const changes: Record<string, ChangeType> = {};

  for (const name in newDeps) {
    if (oldDeps[name]) {
      if (!definitionsEqual(oldDeps[name], newDeps[name])) {
        changes[name] = "update";
      }
    } else {
      changes[name] = "add";
    }
  }

  for (const name in oldDeps) {
    if (!newDeps[name]) {
      changes[name] = "remove";
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

export function reportDependencyChanges(
  changes: Record<string, ChangeType>,
  report: (msg: string) => void
): void {
  for (const name in changes) {
    const change = String(changes[name]).padEnd(6, " ");
    report(`${change} - ${name}`);
  }
}

export function sortStringRecord<T>(
  toSort: Record<string, T>,
  target?: Record<string, T>
): Record<string, T> {
  const sortedKeys = Object.keys(toSort).sort();
  target ??= {};
  for (const key of sortedKeys) {
    target[key] = toSort[key];
  }
  return target;
}
