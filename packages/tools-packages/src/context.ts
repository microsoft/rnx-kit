import { readJSONFileSync } from "@rnx-kit/tools-filesystem";
import type { PackageManifest } from "@rnx-kit/types-node";
import type { Yarn } from "@yarnpkg/types";
import path from "node:path";
import {
  createJSONValidator,
  isJSONValidator,
  type JSONValidatorOptions,
} from "./json.ts";
import type {
  JSONValue,
  PackageContext,
  PackageValidationContext,
  JSONValuePath,
  JSONValidationResult,
} from "./types";

/**
 * Create a core package context for a given root directory and optional manifest.
 * @param root root directory of the package
 * @param manifest optional package manifest, if not provided it will be loaded from root/package.json
 * @returns a CorePackageContext with basic properties and file checking capabilities, but no enforce or validate functions
 */
export function createPackageContext<
  TManifest extends PackageManifest = PackageManifest,
>(root: string, loadedManifest?: TManifest): PackageContext<TManifest> {
  root = path.resolve(root);
  const manifest =
    loadedManifest ??
    readJSONFileSync<TManifest>(path.join(root, "package.json"));
  return {
    root,
    manifest,
    name: manifest.name,
  };
}

/**
 * Creates a package validation context from a path to a package root (with an optional manifest).
 * This will wrap the package manifest in a JSON validator so that enforce, error, changed, and finish
 * methods are available for validating and optionally fixing the package.json contents.
 *
 * @param base root path or for the package
 * @param manifest optional package manifest to use instead of loading from the package root
 * @param options optional JSON validator options to configure how the package.json is validated and fixed
 * @returns a PackageValidationContext wrapping the package manifest with JSON validation capabilities
 */
export function createPackageValidationContext<
  TManifest extends PackageManifest = PackageManifest,
>(
  base: string,
  manifest: TManifest | undefined = undefined,
  options: JSONValidatorOptions = {}
): PackageValidationContext<TManifest> {
  const context = createPackageContext<TManifest>(base, manifest);
  const jsonFilePath = path.join(context.root, "package.json");

  return createJSONValidator(
    context.manifest as Record<string, JSONValue>,
    { ...options, jsonFilePath },
    context
  );
}

/**
 * Adds JSON validator capabilities to an existing package context using the default options for JSON validation.
 * If it is already a JSON validator it will be returned as-is without modification.
 *
 * @param context the package context to enhance with JSON validator capabilities
 * @returns a package validation context wrapping the provided package context with JSON validation capabilities
 */
export function asPackageValidationContext<
  TManifest extends PackageManifest = PackageManifest,
>(context: PackageContext<TManifest>): PackageValidationContext<TManifest> {
  if (isJSONValidator(context)) {
    return context;
  }
  const jsonFilePath = path.join(context.root, "package.json");
  return createJSONValidator(
    context.manifest as Record<string, JSONValue>,
    { jsonFilePath },
    context
  );
}

/**
 * Create a package validation context for a yarn workspace provided by the constraints API. This will route the validation context
 * APIs to the provided workspace, which will error or fix depending on whether fix mode is enabled for the constraints execution.
 * This allows the same validation code to be used both in standalone mode and as part of yarn constraints.
 *
 * --- IMPORTANT NOTE ---
 * When running in yarn constraints mode, yarn handles error reporting and tracking internally. As a result, the 'changed' and 'finish'
 * methods will be no-ops and will not reflect changes. Also manual modifications to manifest may have unexpected results.
 *
 * @param workspace The yarn workspace to create the context for
 * @returns A package validation context for the provided yarn workspace
 */
export function createYarnWorkspaceContext<
  TManifest extends PackageManifest = PackageManifest,
>(workspace: Yarn.Constraints.Workspace): PackageValidationContext<TManifest> {
  return {
    ...createPackageContext(workspace.cwd, workspace.manifest as TManifest),
    enforce(path: JSONValuePath, value: JSONValue | undefined): void {
      if (value === undefined) {
        workspace.unset(path);
      } else {
        workspace.set(path, value);
      }
    },
    changed: yarnChangedStub,
    finish: yarnFinishStub,
    error(message: string): void {
      workspace.error(message);
    },
  };
}

function yarnFinishStub(): JSONValidationResult {
  return { changes: false, errors: false };
}

function yarnChangedStub(): void {
  // no-op as yarn constraints will handle this internally
}
