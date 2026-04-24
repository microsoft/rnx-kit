import type { PackageManifest } from "@rnx-kit/types-node";
import fs from "node:fs";
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
 * Generally fix mode is something that is enabled via command line flags or configuration.
 * When enabled, validation routines that support "fixing" will apply changes to the underlying
 * JSON files rather than just reporting errors. This flag is global to the package validation
 * context and can be toggled via setFixMode().
 */
let fixMode = false;

export function setDefaultFixMode(enabled: boolean): void {
  fixMode = enabled;
}

export function defaultFixMode(): boolean {
  return fixMode;
}

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
    JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
  return {
    root,
    manifest,
    name: manifest.name,
  };
}

export function createPackageValidationContext<
  TManifest extends PackageManifest = PackageManifest,
>(
  base: string | PackageContext<TManifest>,
  manifest?: TManifest,
  options?: JSONValidatorOptions
): PackageValidationContext<TManifest> {
  const context =
    typeof base === "string" ? createPackageContext(base, manifest) : base;
  if (isJSONValidator(context)) {
    return context;
  }
  return createJSONValidator(
    context.manifest as Record<string, JSONValue>,
    options,
    context
  );
}
/**
 * This is only indirectly exported from @yarnpkg/types but is the intended API for working with
 * yarn constraints on a workspace package
 * @internal
 */
export type YarnWorkspace = {
  cwd: string;
  ident: string | null;
  manifest: PackageManifest;
  pkg?: object;
  set(path: JSONValuePath, value: JSONValue): void;
  unset(path: JSONValuePath): void;
  error(message: string): void;
};

/**
 * Create a package validation context for a yarn workspace provided by the constraints API. This will route the validation context
 * APIs to the provided workspace, which will error or fix depending on whether fix mode is enabled for the constraints execution.
 * This allows the same validation code to be used both in standalone mode and as part of yarn constraints.
 * @param workspace The yarn workspace to create the context for
 * @returns A package validation context for the provided yarn workspace
 */
export function createYarnWorkspaceContext<
  TManifest extends PackageManifest = PackageManifest,
>(workspace: YarnWorkspace): PackageValidationContext<TManifest> {
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
