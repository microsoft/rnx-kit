import {
  createJSONValidator,
  getJSONPathSegments,
  type JSONValidator,
  type JSONValue,
  type JSONValuePath,
} from "@rnx-kit/lint-json";
import { readJSONFileSync } from "@rnx-kit/tools-filesystem";
import type { PackageManifest } from "@rnx-kit/types-node";
import type { Yarn } from "@yarnpkg/types";
import fs from "node:fs";
import path from "node:path";
import { styleText } from "node:util";

/**
 * Options for configuring a PackageValidationContext instance
 */
export type PackageValidationContextOptions<
  TManifest extends PackageManifest = PackageManifest,
> = {
  /**
   * Whether to open in fix mode
   */
  fix?: boolean;

  /**
   * Optional package manifest to use instead of loading from the package root, in case it is already loaded
   * and available to avoid reading from disk again.
   */
  manifest?: TManifest;

  /**
   * Yarn workspace instance to use instead of operating on the package root directly
   */
  workspace?: Yarn.Constraints.Workspace;

  /**
   * Error header string to display at the top of the error output for this package.
   * Typically this would include the package name and root directory to indicate
   * which package the errors belong to when validating multiple packages.
   */
  header?: string;

  /**
   * Footer message to display at the end of validation output if errors were found.
   */
  footer?: string;
};

/**
 * A validation context for a package, providing access to the package root, manifest,
 * and utilities for enforcing JSON structure, checking for file existence, and optionally
 * fixing issues in the package manifest or other JSON files.
 *
 * Issues can be reported via the `error` method, which collects errors encountered
 * during validation and reports them when `finish` is called.
 */
export class PackageValidationContext<
  TManifest extends PackageManifest = PackageManifest,
> {
  readonly root: string;
  readonly manifest: TManifest;
  readonly name: string;
  readonly fix: boolean;
  enforce: JSONValidator;

  private delegates: Record<string, JSONValidator | null> = {};
  private existingFiles: Record<string, boolean> = {};
  private static JS_CONFIG_EXTENSIONS = [".js", ".cjs", ".mjs", ".ts"];

  /**
   * Create a new PackageValidationContext for a given package root, optionally
   * configured with a manifest, fix mode, or Yarn workspace instance.
   * @param root the root directory of the package
   * @param options optional options for additional configuration
   */
  constructor(
    root: string,
    options: PackageValidationContextOptions<TManifest> = {}
  ) {
    const { fix, manifest, workspace, footer: errorFooter } = options;
    this.fix = fix ?? false;
    this.root = path.resolve(root);
    const manifestPath = path.join(root, "package.json");
    this.manifest =
      manifest ??
      workspace?.manifest ??
      readJSONFileSync<TManifest>(manifestPath);
    this.name = this.manifest.name;
    const errorHeader =
      options.header ??
      `${styleText("red", "errors")} in package ${this.name} (${path.relative(process.cwd(), this.root)}):`;

    if (workspace) {
      this.enforce = createYarnWorkspaceValidator(workspace);
    } else {
      this.enforce = createJSONValidator(
        manifestPath,
        this.manifest as Record<string, JSONValue>,
        { fix: this.fix, errorHeader, errorFooter }
      );
    }
  }

  /**
   * Report an error encountered during validation. Errors are collected and
   * reported when `finish` is called.
   * @param message the error message to report
   */
  error(message: string) {
    // route through the main validator so that all errors are collected in a single place
    this.enforce.error(message);
  }

  /**
   * Finish validation for this package, invoking `finish` on any delegated
   * JSON validators and the main enforce validator, then reporting any
   * collected errors to the console.
   * @returns a process exit code (1 if any errors were found, 0 otherwise)
   */
  finish(): number {
    for (const delegate of Object.values(this.delegates)) {
      delegate?.finish();
    }
    // this will flush all errors collected by the main validator and print them to the console
    return this.enforce.finish();
  }

  /**
   * Validate an additional JSON file at the given path as part of this overall package validation
   * @param jsonPath the path to the JSON file to validate, relative to the package root
   * @returns a JSONValidator for the specified file, or null if the file does not exist
   */
  validateJSON(jsonPath: string): JSONValidator | null {
    jsonPath = path.resolve(this.root, jsonPath);
    if (!(jsonPath in this.delegates)) {
      if (this.fileExists(jsonPath)) {
        const errorHeader = `${styleText("red", "errors")} in ${path.relative(this.root, jsonPath)}:`;
        this.delegates[jsonPath] = createJSONValidator(jsonPath, undefined, {
          fix: this.fix,
          errorHeader,
          reportError: this.error.bind(this),
        });
      } else {
        this.delegates[jsonPath] = null;
      }
    }
    return this.delegates[jsonPath];
  }

  /**
   * Check whether a file exists at the given path relative to the package root
   * @param filePath the path to the file to check, relative to the package root
   * @returns true if the file exists, false otherwise
   */
  hasFile(filePath: string): boolean {
    return this.fileExists(path.resolve(this.root, filePath));
  }

  /**
   * Find a JavaScript or TypeScript configuration file with the given base name
   * by checking for the presence of any of the supported JS config extensions
   * (.js, .cjs, .mjs, .ts) relative to the package root.
   * @param baseName the base name of the configuration file to find, relative to the package root
   * @returns the resolved path to the first matching configuration file found, or undefined if none exist
   */
  findJSConfig(baseName: string): string | undefined {
    baseName = path.resolve(this.root, baseName);
    for (const ext of PackageValidationContext.JS_CONFIG_EXTENSIONS) {
      if (this.fileExists(`${baseName}${ext}`)) {
        return `${baseName}${ext}`;
      }
    }
    return undefined;
  }

  /**
   * Check whether a file exists at the given absolute path, caching the result
   * to avoid repeated filesystem checks.
   * @param resolvedPath the absolute path to the file to check
   * @returns true if the file exists, false otherwise
   */
  private fileExists(resolvedPath: string): boolean {
    if (this.existingFiles[resolvedPath] === undefined) {
      this.existingFiles[resolvedPath] = fs.existsSync(resolvedPath);
    }
    return this.existingFiles[resolvedPath];
  }
}

/**
 * Create a JSONValidator for a Yarn constraints workspace, allowing enforcement
 * of JSON values and reporting of errors within the workspace context.
 * @param workspace yarn constraints workspace to create a JSONValidator for
 * @returns json validator workspace
 */
export function createYarnWorkspaceValidator(
  workspace: Yarn.Constraints.Workspace
): JSONValidator {
  function enforce(path: JSONValuePath, value: JSONValue | undefined): void {
    const safePath = getJSONPathSegments(path);
    if (value === undefined) {
      workspace.unset(safePath);
    } else {
      workspace.set(safePath, value);
    }
  }

  function error(message: string): void {
    workspace.error(message);
  }

  function finish() {
    return 0;
  }

  return Object.assign(enforce, { error, finish });
}
